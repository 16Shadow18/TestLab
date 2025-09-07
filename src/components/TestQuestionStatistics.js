import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import '../styles/TestStatistics.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const TestQuestionStatistics = ({ testId, onClose }) => {
    const [statistics, setStatistics] = useState([]);

    useEffect(() => {
        const fetchStatistics = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/test-question-statistics/${testId}`);
                setStatistics(response.data);
            } catch (error) {
                console.error('Ошибка загрузки статистики:', error);
            }
        };

        fetchStatistics();
    }, [testId]);

    const labels = statistics.map(stat => stat.question_text);
    const data = {
        labels: labels,
        datasets: [
            {
                label: 'Правильные ответы',
                data: statistics.map(stat => stat.correct_answers),
                backgroundColor: 'rgba(75, 192, 192, 0.4)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            },
            {
                label: 'Неправильные ответы',
                data: statistics.map(stat => stat.incorrect_answers),
                backgroundColor: 'rgba(255, 99, 132, 0.4)',
                borderColor: 'rgba(255, 99, 132, 1)',
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
                    text: 'Количество ответов',
                },
            },
            x: {
                title: {
                    display: true,
                    text: 'Вопросы',
                },
            },
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const label = context.dataset.label || '';
                        const value = context.raw || 0;
                        return `${label}: ${value}`;
                    },
                },
            },
        },
    };

    return (
        <div className="statistics-modal">
            <div className="modal-content">
                <h2>Результаты по вопросам</h2>
                <Bar data={data} options={options} />
                <button onClick={onClose}>Закрыть</button>
            </div>
        </div>
    );
};

export default TestQuestionStatistics;
