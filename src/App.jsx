import { useEffect, useState, Suspense } from 'react';
import './App.css';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Line } from 'react-chartjs-2';
import {
	Chart as ChartJS,
	LineElement,
	PointElement,
	CategoryScale,
	LinearScale,
	Title,
	Tooltip,
	Legend,
} from 'chart.js';
import 'tailwindcss/tailwind.css';
import 'daisyui/dist/full.css';
import Spinner from './components/spinner';

// Initialize Chart.js
ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const firebaseConfig = {
	apiKey: 'AIzaSyD9QIOoSx5W5WqK-3cZvY0zmqn0OGMOvNU',
	authDomain: 'mikikotech-9ddc7.firebaseapp.com',
	databaseURL: 'https://mikikotech-9ddc7-default-rtdb.asia-southeast1.firebasedatabase.app',
	projectId: 'mikikotech-9ddc7',
	storageBucket: 'mikikotech-9ddc7.appspot.com',
	messagingSenderId: '466391433918',
	appId: '1:466391433918:web:99f6ea84d1f1edeccb14ef',
	measurementId: 'G-41D31W598B',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

function App() {
	const [data, setData] = useState([]);
	const [dataMCU, setDataMCU] = useState({});
	const [clock, setClock] = useState('');
	const [temperature, setTemperature] = useState('');
	const [soilTemperature, setSoilTemperature] = useState('');
	const [humidity, setHumidity] = useState('');
	const [soilHumidity, setSoilHumidity] = useState('');

	// Fetch and listen for real-time updates from Firebase for MCU control
	const listenForControlUpdates = () => {
		const controlRef = ref(database, 'MCU/1Xvvxx57qAUFtrpJucCThDjZbdB2/control');
		onValue(controlRef, (snapshot) => {
			if (snapshot.exists()) {
				setDataMCU(snapshot.val());
			} else {
				console.log('No data available');
			}
		});
	};

	// Fetch and listen for real-time updates from Firebase for sensor data
	const listenForDataUpdates = () => {
		const dbRef = ref(database, 'PohonSensor/1Xvvxx57qAUFtrpJucCThDjZbdB2/data');
		onValue(dbRef, (snapshot) => {
			if (snapshot.exists()) {
				const readingsData = snapshot.val();
				const formattedData = Object.keys(readingsData).map((key) => ({
					id: key,
					...readingsData[key],
				}));

				// Sort data by timestamp and get the 10 newest entries
				const sortedData = formattedData.sort((a, b) => a.timestamp - b.timestamp).slice(0, 10);
				setData(sortedData);
			} else {
				console.log('No data available');
			}
		});
	};

	const toggleControl = async (control) => {
		try {
			const updatedValue = dataMCU[control] === 0 ? 1 : 0;
			const controlRef = ref(database, `MCU/1Xvvxx57qAUFtrpJucCThDjZbdB2/control`);
			await update(controlRef, {
				[control]: updatedValue,
			});
			setDataMCU((prevData) => ({ ...prevData, [control]: updatedValue }));
		} catch (error) {
			console.error('Error updating data:', error);
		}
	};

	useEffect(() => {
		signInAnonymously(auth)
			.then(() => {
				console.log('Signed in anonymously');
				listenForControlUpdates();
				listenForDataUpdates();
			})
			.catch((error) => {
				console.error('Sign-in error:', error);
			});

		onAuthStateChanged(auth, (user) => {
			if (user) {
				console.log('User is signed in:', user);
			} else {
				console.log('No user is signed in');
			}
		});
	}, []);

	const formatTimestampForTable = (timestamp) => {
		const date = new Date(parseInt(timestamp) * 1000);
		const day = date.getDate();
		const month = date.toLocaleString('default', { month: 'long' });
		const year = date.getFullYear();
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		return `${day} ${month} ${year} ${hours}:${minutes}`;
	};

	const formatTimestampForChart = (timestamp) => {
		const date = new Date(parseInt(timestamp) * 1000);
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		return `${hours}:${minutes}`;
	};

	// Prepare data for the line charts
	const chartDataTemperature = {
		labels: data.map((reading) => formatTimestampForChart(reading.timestamp)),
		datasets: [
			{
				label: 'Temperature',
				data: data.map((reading) => reading.temperature),
				borderColor: 'rgba(75, 192, 192, 1)',
				backgroundColor: 'rgba(75, 192, 192, 0.2)',
				fill: false,
			},
		],
	};

	const chartDataSoilTemperature = {
		labels: data.map((reading) => formatTimestampForChart(reading.timestamp)),
		datasets: [
			{
				label: 'Soil Temperature',
				data: data.map((reading) => reading.soiltemp),
				borderColor: 'rgba(255, 99, 132, 1)',
				backgroundColor: 'rgba(255, 99, 132, 0.2)',
				fill: false,
			},
		],
	};

	const chartDataHumidity = {
		labels: data.map((reading) => formatTimestampForChart(reading.timestamp)),
		datasets: [
			{
				label: 'Humidity',
				data: data.map((reading) => reading.humidity),
				borderColor: 'rgba(153, 102, 255, 1)',
				backgroundColor: 'rgba(153, 102, 255, 0.2)',
				fill: false,
			},
		],
	};

	const chartDataSoilHumidity = {
		labels: data.map((reading) => formatTimestampForChart(reading.timestamp)),
		datasets: [
			{
				label: 'Soil Humidity',
				data: data.map((reading) => reading.soilhum),
				borderColor: 'rgba(255, 159, 64, 1)',
				backgroundColor: 'rgba(255, 159, 64, 0.2)',
				fill: false,
			},
		],
	};

	const chartOptions = {
		responsive: true,
		plugins: {
			legend: {
				position: 'top',
			},
			tooltip: {
				callbacks: {
					label: function (context) {
						return `${context.dataset.label}: ${context.raw}`;
					},
				},
			},
		},
	};

	return (
		<Suspense fallback={<Spinner />}>
			<div className='main-container p-4'>
				<div className='w-[10em] self-center'>
					<img src='/logo/mikiko.png' alt='' className='w-full h-auto object-contain' />
				</div>
				<h1 className='text-3xl font-bold mb-4'>Mikiko Smart Farming</h1>
				<div className='data grid grid-cols-1 md:grid-cols-1 gap-4'>
					<div className='line-charts grid gap-4'>
						<div className='top grid grid-cols-1 md:grid-cols-2 gap-4'>
							<div className='chart-container'>
								<h2 className='text-xl font-semibold'>Temperature</h2>
								{data.length > 0 ? (
									<Line data={chartDataTemperature} options={chartOptions} />
								) : (
									<div className='w-full h-full flex items-center justify-center overflow-hidden'>
										<div className='w-full h-full flex items-center justify-center overflow-hidden'>
											<span className='loading loading-spinner loading-lg'></span>
										</div>
									</div>
								)}
							</div>
							<div className='chart-container'>
								<h2 className='text-xl font-semibold'>Soil Temperature</h2>
								{data.length > 0 ? (
									<Line data={chartDataSoilTemperature} options={chartOptions} />
								) : (
									<div className='w-full h-full flex items-center justify-center overflow-hidden'>
										<span className='loading loading-spinner loading-lg'></span>
									</div>
								)}
							</div>
						</div>
						<div className='bottom grid grid-cols-1 md:grid-cols-2 gap-4'>
							<div className='chart-container'>
								<h2 className='text-xl font-semibold'>Humidity</h2>
								{data.length > 0 ? (
									<Line data={chartDataHumidity} options={chartOptions} />
								) : (
									<div className='w-full h-full flex items-center justify-center overflow-hidden'>
										<span className='loading loading-spinner loading-lg'></span>
									</div>
								)}
							</div>
							<div className='chart-container'>
								<h2 className='text-xl font-semibold'>Soil Humidity</h2>
								{data.length > 0 ? (
									<Line data={chartDataSoilHumidity} options={chartOptions} />
								) : (
									<div className='w-full h-full flex items-center justify-center overflow-hidden'>
										<span className='loading loading-spinner loading-lg'></span>
									</div>
								)}
							</div>
						</div>
					</div>
					<div className='control-panel'>
						<h2 className='text-xl font-semibold mb-2'>Control Panel</h2>
						<div className='flex flex-col justify-start gap-y-4'>
							<div className='button-control grid grid-cols-3 overflow-hidden h-fit gap-x-2 gap-y-2'>
								<button className='btn btn-primary' onClick={() => toggleControl('pump')}>
									Pump: {dataMCU.pump === 0 ? 'Off' : 'On'}
								</button>
								<button className='btn btn-primary' onClick={() => toggleControl('sprinkler1')}>
									Sprinkler 1: {dataMCU.sprinkler1 === 0 ? 'Off' : 'On'}
								</button>
								<button className='btn btn-primary' onClick={() => toggleControl('sprinkler2')}>
									Sprinkler 2: {dataMCU.sprinkler2 === 0 ? 'Off' : 'On'}
								</button>
								<button className='btn btn-primary' onClick={() => toggleControl('sprinkler3')}>
									Sprinkler 3: {dataMCU.sprinkler3 === 0 ? 'Off' : 'On'}
								</button>
								<button className='btn btn-primary' onClick={() => toggleControl('driptape')}>
									Drip Tape: {dataMCU.driptape === 0 ? 'Off' : 'On'}
								</button>
								<button className='btn btn-primary' onClick={() => toggleControl('fogger')}>
									Fogger: {dataMCU.fogger === 0 ? 'Off' : 'On'}
								</button>
							</div>
							<form className='grid grid-cols-2 gap-4 flex-1'>
								<div className='form-control'>
									<label className='label'>
										<span className='label-text'>Clock</span>
									</label>
									<input
										type='text'
										placeholder='Enter clock'
										className='input input-bordered'
										value={clock}
										onChange={(e) => setClock(e.target.value)}
									/>
								</div>
								<div className='form-control'>
									<label className='label'>
										<span className='label-text'>Temperature</span>
									</label>
									<input
										type='text'
										placeholder='Enter temperature'
										className='input input-bordered'
										value={temperature}
										onChange={(e) => setTemperature(e.target.value)}
									/>
								</div>
								<div className='form-control'>
									<label className='label'>
										<span className='label-text'>Soil Temperature</span>
									</label>
									<input
										type='text'
										placeholder='Enter soil temperature'
										className='input input-bordered'
										value={soilTemperature}
										onChange={(e) => setSoilTemperature(e.target.value)}
									/>
								</div>
								<div className='form-control'>
									<label className='label'>
										<span className='label-text'>Humidity</span>
									</label>
									<input
										type='text'
										placeholder='Enter humidity'
										className='input input-bordered'
										value={humidity}
										onChange={(e) => setHumidity(e.target.value)}
									/>
								</div>
								<div className='form-control'>
									<label className='label'>
										<span className='label-text'>Soil Humidity</span>
									</label>
									<input
										type='text'
										placeholder='Enter soil humidity'
										className='input input-bordered'
										value={soilHumidity}
										onChange={(e) => setSoilHumidity(e.target.value)}
									/>
								</div>
							</form>
						</div>
					</div>
					<table className='table table-zebra mt-4'>
						<thead>
							<tr>
								<th>Date</th>
								<th>Humidity</th>
								<th>Rain</th>
								<th>Soil Humidity</th>
								<th>Soil Temperature</th>
								<th>Temperature</th>
							</tr>
						</thead>
						<tbody>
							{Array.isArray(data) && data.length > 0 ? (
								data.map(
									(reading) =>
										reading.timestamp > 1000 && (
											<tr key={reading.id}>
												<td>{reading.timestamp && formatTimestampForTable(reading.timestamp)}</td>
												<td>{reading.humidity}</td>
												<td>{reading.rain <= 0 ? 'No rain' : 'Rain'}</td>
												<td>{reading.soilhum}</td>
												<td>{reading.soiltemp}</td>
												<td>{reading.temperature}</td>
											</tr>
										),
								)
							) : (
								<tr>
									<td colSpan='6'>
										{' '}
										<div className='w-full h-full flex items-center justify-center overflow-hidden'>
											<span className='loading loading-spinner loading-lg'></span>
										</div>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</Suspense>
	);
}

export default App;
