import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Recommendations.css';

const Recommendations = ({ studentId }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecommendations = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/recommendations/${studentId}`);
                setRecommendations(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Ошибка загрузки рекомендаций:', error);
                setLoading(false);
            }
        };

        // Первая загрузка
        fetchRecommendations();

        // Обновление каждые 30 минут
        const interval = setInterval(fetchRecommendations, 30 * 60 * 1000);

        // Очистка интервала при размонтировании
        return () => clearInterval(interval);
    }, [studentId]);

    const handleStartTest = (testId) => {
        window.location.href = `/test/${testId}`;
    };

    const getTypeDetails = (type) => {
        const details = {
            'unfinished': {
                label: 'Незавершённый тест',
                color: '#ED8936',
                icon: '✏️',
                showButton: true,
                buttonText: 'Продолжить'
            },
            'frequency': {
                label: 'Низкая активность',
                color: '#F6AD55',
                icon: '⏱️',
                showButton: false
            },
            'failed_attempts': {
                label: 'Неудачные попытки',
                color: '#F56565',
                icon: '❌',
                showButton: false
            },
            'average_score': {
                label: 'Средний балл',
                color: '#4299E1',
                icon: '📊',
                showButton: false
            },
            'inactivity': {
                label: 'Давно не проходили',
                color: '#9F7AEA',
                icon: '⌛',
                showButton: false
            },
            'weak_topic': {
                label: 'Слабая тема',
                color: '#F56565',
                icon: '⚠️',
                showButton: false
            }
        };
        return details[type] || { label: type, color: '#CBD5E0', icon: 'ℹ️', showButton: false };
    };

    if (loading) {
        return <div className="loading">Загрузка рекомендаций...</div>;
    }

    return (
        <div className="recommendations-container">
            <div className="recommendations-header">
                <h2>Персональные рекомендации</h2>
            </div>

            {recommendations.length > 0 ? (
                <ul className="recommendations-list">
                    {recommendations.map((rec, index) => {
                        const typeInfo = getTypeDetails(rec.type);
                        return (
                            <li key={index} className="recommendation-item">
                                <div className="recommendation-content">
                                    <p>{rec.message || `Рекомендуем тест #${rec.test_id}`}</p>
                                    {typeInfo.showButton && (
                                        <button
                                            onClick={() => handleStartTest(rec.test_id)}
                                            className="start-button"
                                        >
                                            {typeInfo.buttonText}
                                        </button>
                                    )}
                                </div>
                                <div className="recommendation-type" style={{backgroundColor: typeInfo.color}}>
                                    <span className="type-icon">{typeInfo.icon}</span>
                                    {typeInfo.label}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="no-recommendations">Нет рекомендаций для отображения</p>
            )}
        </div>
    );
};

export default Recommendations;
