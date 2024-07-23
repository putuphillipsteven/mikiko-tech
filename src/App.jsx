import { useEffect, useState } from 'react';
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
		<div className='main-container'>
			<h1>Mikiko Smart Farming</h1>
			<div className='data'>
				<div className='line-charts'>
					<div className='top'>
						<div className='chart-container'>
							<h2>Temperature</h2>
							{data.length > 0 ? (
								<Line data={chartDataTemperature} options={chartOptions} />
							) : (
								<p>No data available for the chart</p>
							)}
						</div>
						<div className='chart-container'>
							<h2>Soil Temperature</h2>
							{data.length > 0 ? (
								<Line data={chartDataSoilTemperature} options={chartOptions} />
							) : (
								<p>No data available for the chart</p>
							)}
						</div>
					</div>
					<div className='bottom'>
						<div className='chart-container'>
							<h2>Humidity</h2>
							{data.length > 0 ? (
								<Line data={chartDataHumidity} options={chartOptions} />
							) : (
								<p>No data available for the chart</p>
							)}
						</div>
						<div className='chart-container'>
							<h2>Soil Humidity</h2>
							{data.length > 0 ? (
								<Line data={chartDataSoilHumidity} options={chartOptions} />
							) : (
								<p>No data available for the chart</p>
							)}
						</div>
					</div>
				</div>
				<div className='control-panel'>
					<h2>Control Panel</h2>
					<div className='button-control'>
						<button onClick={() => toggleControl('pump')}>
							Pump: {dataMCU.pump === 0 ? 'Off' : 'On'}
						</button>
						<button onClick={() => toggleControl('sprinkler1')}>
							Sprinkler 1: {dataMCU.sprinkler1 === 0 ? 'Off' : 'On'}
						</button>
						<button onClick={() => toggleControl('sprinkler2')}>
							Sprinkler 2: {dataMCU.sprinkler2 === 0 ? 'Off' : 'On'}
						</button>
						<button onClick={() => toggleControl('sprinkler3')}>
							Sprinkler 3: {dataMCU.sprinkler3 === 0 ? 'Off' : 'On'}
						</button>
						<button onClick={() => toggleControl('driptape')}>
							Drip Tape: {dataMCU.driptape === 0 ? 'Off' : 'On'}
						</button>
						<button onClick={() => toggleControl('fogger')}>
							Fogger: {dataMCU.fogger === 0 ? 'Off' : 'On'}
						</button>
					</div>
					<table>
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
									<td colSpan='6'>No data available</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

export default App;
