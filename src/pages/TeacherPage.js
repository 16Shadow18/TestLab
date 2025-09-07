import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';
import '../styles/TeacherPage.css';
import EditTestForm from '../components/EditTestForm';
import TestStatistics from '../components/TestStatistics';
import TestQuestionStatistics from '../components/TestQuestionStatistics';

const TeacherPage = ({ userId }) => {
    const [testResults, setTestResults] = useState([]);
    const [createdTests, setCreatedTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [resultsSearchQuery, setResultsSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('asc');
    const [resultsSortBy, setResultsSortBy] = useState('test_title');
    const [resultsSortOrder, setResultsSortOrder] = useState('asc');
    const [editingTest, setEditingTest] = useState(null);
    const [selectedTestId, setSelectedTestId] = useState(null);
    const [showQuestionStatistics, setShowQuestionStatistics] = useState(false);
    const navigate = useNavigate();
    const [topics, setTopics] = useState([]);
    const [showTopicModal, setShowTopicModal] = useState(false);
    const [newTopicName, setNewTopicName] = useState('');
    const [isCreatingTopic, setIsCreatingTopic] = useState(false);
    const [resultsStatusFilter, setResultsStatusFilter] = useState('all'); // 'all', 'completed', 'failed'
    const [topicFilter, setTopicFilter] = useState('all'); // 'all' или ID темы

    useEffect(() => {
        const fetchData = async () => {
            try {
                const resultsResponse = await axios.get(`http://localhost:3001/teacher-test-results/${userId}`);
                setTestResults(resultsResponse.data);

                const testsResponse = await axios.get(`http://localhost:3001/teacher-tests/${userId}`);
                setCreatedTests(testsResponse.data);

                const topicsResponse = await axios.get(`http://localhost:3001/topics?created_by=${userId}`);
                setTopics(topicsResponse.data);

                setLoading(false);
            } catch (error) {
                console.error('Ошибка загрузки данных:', error);
                setLoading(false);
            }
        };

        fetchData();
    }, [userId]);

    const handleCreateTopic = async () => {
        if (!newTopicName.trim()) return;

        setIsCreatingTopic(true);
        try {
            const response = await axios.post('http://localhost:3001/topics', {
                name: newTopicName,
                created_by: userId
            });

            const topicsResponse = await axios.get(`http://localhost:3001/topics?created_by=${userId}`);
            setTopics(topicsResponse.data);

            setNewTopicName('');
            setShowTopicModal(false);
        } catch (error) {
            console.error('Ошибка при создании темы:', error);
            alert(error.response?.data?.message || 'Ошибка при создании темы');
        } finally {
            setIsCreatingTopic(false);
        }
    };

    const handleDeleteTopic = async (topicId) => {
        if (window.confirm('Вы уверены, что хотите удалить эту тему? Все связанные тесты останутся без темы.')) {
            try {
                await axios.delete(`http://localhost:3001/topics/${topicId}`);
                setTopics(topics.filter(topic => topic.id !== topicId));
            } catch (error) {
                console.error('Ошибка при удалении темы:', error);
                alert(error.response?.data?.message || 'Ошибка при удалении темы');
            }
        }
    };

    const handleEditTest = async (test) => {
        try {
            const response = await axios.get(`http://localhost:3001/test/${test.id}/questions`);
            const questionsWithAnswers = response.data;
            setEditingTest({
                ...test,
                questions: questionsWithAnswers,
            });
        } catch (error) {
            console.error('Ошибка загрузки вопросов и ответов:', error);
            alert('Ошибка загрузки данных теста');
        }
    };

    const handleCloseModal = () => {
        setEditingTest(null);
    };

    const handleSaveTest = async (updatedTest) => {
        try {
            const response = await axios.put(`http://localhost:3001/update-test/${updatedTest.id}`, updatedTest);
            const updatedTestData = response.data;

            const topic = topics.find(t => t.id === updatedTestData.topic_id);
            const topic_name = topic ? topic.name : null;

            setCreatedTests(prev => prev.map(test =>
                test.id === updatedTest.id
                    ? {
                        ...test,
                        ...updatedTestData,
                        topic_name,
                        questions: updatedTestData.questions
                    }
                    : test
            ));

            handleCloseModal();
        } catch (error) {
            console.error('Ошибка при обновлении теста:', error);
            alert('Ошибка при обновлении теста');
        }
    };

    const handleDeleteTest = async (testId) => {
        try {
            await axios.delete(`http://localhost:3001/delete-test/${testId}`);
            const updatedTests = createdTests.filter(test => test.id !== testId);
            setCreatedTests(updatedTests);
        } catch (error) {
            console.error('Ошибка удаления теста:', error);
            alert('Ошибка удаления теста');
        }
    };

    const handleTestClick = (testId) => {
        setSelectedTestId(testId);
    };

    const handleQuestionStatisticsClick = (testId) => {
        setSelectedTestId(testId);
        setShowQuestionStatistics(true);
    };

    const handleCloseStatistics = () => {
        setSelectedTestId(null);
        setShowQuestionStatistics(false);
    };

    const filteredTests = createdTests.filter(test => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
            test.title.toLowerCase().includes(query) ||
            test.description.toLowerCase().includes(query)
        );

        const matchesTopic = (
            topicFilter === 'all' ||
            (topicFilter === 'no-topic' && !test.topic_id) ||
            (topicFilter !== 'no-topic' && test.topic_id === parseInt(topicFilter))
        );

        return matchesSearch && matchesTopic;
    });

    const sortedTests = filteredTests.sort((a, b) => {
        if (sortOrder === 'asc') {
            return a.title.localeCompare(b.title);
        } else {
            return b.title.localeCompare(a.title);
        }
    });

    const filteredResults = testResults.filter(result => {
        const query = resultsSearchQuery.toLowerCase();
        return (
            (result.test_title.toLowerCase().includes(query) ||
                result.full_name.toLowerCase().includes(query) ||
                result.group_name.toLowerCase().includes(query)) &&
            (resultsStatusFilter === 'all' || result.status === resultsStatusFilter)
        );
    });

    const sortedResults = filteredResults.sort((a, b) => {
        if (resultsSortBy === 'test_title') {
            return resultsSortOrder === 'asc'
                ? a.test_title.localeCompare(b.test_title)
                : b.test_title.localeCompare(a.test_title);
        } else if (resultsSortBy === 'score') {
            return resultsSortOrder === 'asc'
                ? a.score - b.score
                : b.score - a.score;
        } else if (resultsSortBy === 'date') {
            return resultsSortOrder === 'asc'
                ? new Date(a.completed_at) - new Date(b.completed_at)
                : new Date(b.completed_at) - new Date(a.completed_at);
        }
        return 0;
    });

    if (loading) {
        return <div className="loading">Загрузка...</div>;
    }

    return (
        <div className="teacher-container">
            <LogoutButton/>
            <Link to="/teacher/create-test" className="create-test-button">
                Создать тест
            </Link>
            <div className="topics-management">
                <h2>Управление темами</h2>
                <button
                    onClick={() => setShowTopicModal(true)}
                    className="create-topic-button"
                >
                    Создать новую тему
                </button>

                <div className="topics-list">
                    {topics.length > 0 ? (
                        topics.map(topic => (
                            <div key={topic.id} className="topic-item">
                                <span>{topic.name}</span>
                                {topic.created_by === userId && (
                                    <button
                                        onClick={() => handleDeleteTopic(topic.id)}
                                        className="delete-topic-button"
                                        title="Удалить тему"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="no-topics-message">У вас пока нет созданных тем</p>
                    )}
                </div>
            </div>
            <div className="content-wrapper">
                <div className="tests-list">
                    <h2>Созданные тесты</h2>

                    <div className="filters-container">
                        <input
                            type="text"
                            placeholder="Поиск по названию или описанию"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />

                        <select
                            value={topicFilter}
                            onChange={(e) => setTopicFilter(e.target.value)}
                            className="topic-filter-select"
                        >
                            <option value="all">Все темы</option>
                            {topics.map(topic => (
                                <option key={topic.id} value={topic.id}>
                                    {topic.name}
                                </option>
                            ))}
                            <option value="no-topic">Без темы</option>
                        </select>

                        <button
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="sort-button"
                        >
                            Сортировать по названию {sortOrder === 'asc' ? '▲' : '▼'}
                        </button>
                    </div>

                    {sortedTests.length > 0 ? (
                        <ul>
                            {sortedTests.map(test => (
                                <li key={test.id}>
                                    <div className="test-header">
                                        <h3>{test.title}</h3>
                                        {test.topic_name && (
                                            <span className="topic-tag">{test.topic_name}</span>
                                        )}
                                    </div>
                                    <p>{test.description}</p>

                                    <div className="test-actions">
                                        <button
                                            onClick={() => handleTestClick(test.id)}
                                            className="icon-button"
                                            title="Результаты"
                                        >
                                            📊
                                        </button>
                                        <button
                                            onClick={() => handleQuestionStatisticsClick(test.id)}
                                            className="icon-button"
                                            title="Анализ по вопросам"
                                        >
                                            ❓
                                        </button>
                                        <button
                                            onClick={() => handleEditTest(test)}
                                            className="icon-button"
                                            title="Редактировать"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTest(test.id)}
                                            className="icon-button"
                                            title="Удалить"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>Тесты не найдены.</p>
                    )}
                </div>

                <div className="results-table">
                    <h2>Результаты тестирования</h2>
                    <input
                        type="text"
                        placeholder="Поиск по названию теста"
                        value={resultsSearchQuery}
                        onChange={(e) => setResultsSearchQuery(e.target.value)}
                        className="search-input"
                    />

                    <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
                        <select
                            value={resultsSortBy}
                            onChange={(e) => setResultsSortBy(e.target.value)}
                            className="sort-select"
                        >
                            <option value="test_title">По названию теста</option>
                            <option value="score">По результату</option>
                            <option value="date">По дате</option>
                        </select>

                        <select
                            value={resultsStatusFilter}
                            onChange={(e) => setResultsStatusFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">Все попытки</option>
                            <option value="completed">Только успешные</option>
                            <option value="failed">Только неудачные</option>
                        </select>

                        <button
                            onClick={() => setResultsSortOrder(resultsSortOrder === 'asc' ? 'desc' : 'asc')}
                            className="sort-button"
                        >
                            {resultsSortOrder === 'asc' ? '▲' : '▼'}
                        </button>
                    </div>

                    {sortedResults.length > 0 ? (
                        <table>
                            <thead>
                            <tr>
                                <th>Студент</th>
                                <th>Группа</th>
                                <th>Тест</th>
                                <th>Результат</th>
                                <th>Статус</th>
                                <th>Дата</th>
                            </tr>
                            </thead>
                            <tbody>
                            {sortedResults.map((result, index) => (
                                <tr key={index}>
                                    <td>{result.full_name}</td>
                                    <td>{result.group_name}</td>
                                    <td>{result.test_title}</td>
                                    <td>{result.score}%</td>
                                    <td style={{
                                        color: result.status === 'completed' ? 'green' : 'red',

                                    }}>
                                        {result.status === 'completed' ? 'Пройден' : 'Не пройден'}
                                    </td>
                                    <td>{new Date(result.completed_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    ) : (
                        <div>Результаты не найдены.</div>
                    )}
                </div>
            </div>

            {editingTest && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Редактирование теста</h2>
                        <EditTestForm
                            test={editingTest}
                            onSave={handleSaveTest}
                            onClose={handleCloseModal}
                            userId={userId}
                        />
                    </div>
                </div>
            )}

            {selectedTestId && (
                <TestStatistics testId={selectedTestId} onClose={handleCloseStatistics}/>
            )}

            {showQuestionStatistics && (
                <TestQuestionStatistics testId={selectedTestId} onClose={handleCloseStatistics}/>
            )}
            {showTopicModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Создание новой темы</h2>
                        <div className="form-group">
                            <label>Название темы:</label>
                            <input
                                type="text"
                                value={newTopicName}
                                onChange={(e) => setNewTopicName(e.target.value)}
                                placeholder="Введите название темы"
                            />
                        </div>
                        <div className="modal-buttons">
                            <button
                                onClick={handleCreateTopic}
                                className="save-button"
                                disabled={!newTopicName.trim() || isCreatingTopic}
                            >
                                {isCreatingTopic ? 'Создание...' : 'Создать'}
                            </button>
                            <button
                                onClick={() => setShowTopicModal(false)}
                                className="cancel-button"
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherPage;
