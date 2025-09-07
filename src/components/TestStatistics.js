import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import '../styles/TestStatistics.css';


ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const TestStatistics = ({ testId, onClose }) => {
    const [statistics, setStatistics] = useState([]);

    useEffect(() => {
        const fetchStatistics = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/test-statistics-distribution/${testId}`);
                setStatistics(response.data);
            } catch (error) {
                console.error('Ошибка загрузки статистики:', error);
            }
        };

        fetchStatistics();
    }, [testId]);

    const labels = statistics.map(stat => stat.score_range);
    const data = {
        labels: labels,
        datasets: [
            {
                label: 'Количество студентов',
                data: statistics.map(stat => stat.count),
                backgroundColor: 'rgba(75,192,192,0.4)',
                borderColor: 'rgba(75,192,192,1)',
                borderWidth: 1,
            },
        ],
    };

    const options = {
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1,
                    precision: 0,
                },
                title: {
                    display: true,
                    text: 'Количество студентов',
                },
            },
            x: {
                title: {
                    display: true,
                    text: 'Диапазон результатов',
                },
            },
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const label = context.dataset.label || '';
                        const value = context.raw || 0;
                        return `${label}: ${value} студентов`;
                    },
                },
            },
        },
    };

    return (
        <div className="statistics-modal">
            <div className="modal-content">
                <h2>Распределение результатов теста</h2>
                <Bar data={data} options={options} />
                <button onClick={onClose}>Закрыть</button>
            </div>
        </div>
    );
};

export default TestStatistics;
