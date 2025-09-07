import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LogoutButton from '../components/LogoutButton';
import Recommendations from '../components/Recommendations';
import '../styles/StudentPage.css';

const StudentPage = ({ userId }) => {
    const [userInfo, setUserInfo] = useState(null);
    const [testsWithAttempts, setTestsWithAttempts] = useState([]);
    const [testResults, setTestResults] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: ''
    });
    const [groups, setGroups] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, available, completed
    const [topicFilter, setTopicFilter] = useState('all'); // Фильтр по темам
    const [resultsSearchQuery, setResultsSearchQuery] = useState('');
    const [resultsSortBy, setResultsSortBy] = useState('date'); // date, score
    const [resultsSortOrder, setResultsSortOrder] = useState('desc'); // asc, desc
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'completed', 'failed'
    const [hasNotified, setHasNotified] = useState(false); // Флаг для уведомлений
    const navigate = useNavigate();

    const fetchTestsWithAttempts = async (groupName) => {
        try {
            const testsResponse = await axios.get(`http://localhost:3001/tests-for-student/${groupName}`);
            const tests = testsResponse.data;

            const testsWithAttemptsData = await Promise.all(
                tests.map(async (test) => {
                    const attemptsResponse = await axios.get(`http://localhost:3001/attempts-count/${test.id}/${userId}`);
                    const attemptsCount = attemptsResponse.data.attempts_count;
                    return {
                        ...test,
                        attemptsCount,
                        attemptsLeft: test.attempts_limit - attemptsCount
                    };
                })
            );

            setTestsWithAttempts(testsWithAttemptsData);

            if (testsWithAttemptsData.length > 0 && !hasNotified) {
                const availableTests = testsWithAttemptsData.filter(test => test.attemptsLeft > 0);
                if (availableTests.length > 0) {
                    toast.info(`У вас есть ${availableTests.length} доступных для прохождения тест(ов)!`, {
                        position: "top-right",
                        autoClose: 30000, // 30 секунд
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        progress: undefined,
                    });
                    setHasNotified(true);
                }
            }
        } catch (error) {
            console.error("Ошибка загрузки данных о тестах:", error);
            alert("Ошибка загрузки данных о тестах");
        }
    };

    const fetchTestResults = async () => {
        try {
            const response = await axios.get(`http://localhost:3001/student-test-results/${userId}`);
            setTestResults(response.data);
        } catch (error) {
            console.error("Ошибка загрузки результатов тестов:", error);
            alert("Ошибка загрузки результатов тестов");
        }
    };

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/student-info/${userId}`);
                setUserInfo(response.data);
                setFormData({
                    full_name: response.data.full_name,
                    phone_number: response.data.phone_number
                });
                fetchTestResults();
            } catch (error) {
                console.error("Ошибка загрузки информации о студенте:", error);
                alert("Ошибка загрузки информации о студенте");
            }
        };

        const fetchGroups = async () => {
            try {
                const response = await axios.get('http://localhost:3001/groups');
                setGroups(response.data.map(group => group.name));
            } catch (error) {
                console.error("Ошибка загрузки групп:", error);
                alert("Ошибка загрузки групп");
            }
        };

        if (userId) {
            fetchUserInfo();
            fetchGroups();
        }
    }, [userId]);

    useEffect(() => {
        if (userId && userInfo?.group_name) {
            fetchTestsWithAttempts(userInfo.group_name);
        }
    }, [userId, userInfo?.group_name]);

    const handleEditClick = () => {
        setIsEditing(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`http://localhost:3001/update-user-info/${userId}`, {
                full_name: formData.full_name,
                phone_number: formData.phone_number,
                group_name: userInfo.group_name
            });
            setUserInfo({
                ...userInfo,
                full_name: formData.full_name,
                phone_number: formData.phone_number
            });
            setIsEditing(false);

        } catch (error) {
            console.error("Ошибка при обновлении информации:", error);
            alert('Ошибка при обновлении информации');
        }
    };

    const startTest = async (testId) => {
        try {
            const response = await axios.post('http://localhost:3001/start-test-attempt', {
                testId,
                studentId: userId
            });
            navigate(`/test/${testId}`);
        } catch (error) {
            if (error.response && error.response.status === 403) {
                alert('Превышено количество попыток для этого теста.');
            } else {
                alert('Ошибка при начале теста');
            }
        }
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleFilterChange = (e) => {
        setFilterStatus(e.target.value);
    };

    const filteredTests = testsWithAttempts.filter(test => {
        const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' ||
            (filterStatus === 'available' && test.attemptsLeft > 0) ||
            (filterStatus === 'completed' && test.attemptsLeft <= 0);
        const matchesTopic = topicFilter === 'all' ||
            (topicFilter === 'no-topic' && !test.topic_name) ||
            (test.topic_name && test.topic_id.toString() === topicFilter);
        return matchesSearch && matchesFilter && matchesTopic;
    });

    const handleResultsSearchChange = (e) => {
        setResultsSearchQuery(e.target.value);
    };

    const handleResultsSortChange = (e) => {
        setResultsSortBy(e.target.value);
    };

    const toggleResultsSortOrder = () => {
        setResultsSortOrder(resultsSortOrder === 'asc' ? 'desc' : 'asc');
    };

    const filteredResults = testResults.filter(result => {
        return result.test_title.toLowerCase().includes(resultsSearchQuery.toLowerCase()) &&
            (statusFilter === 'all' || result.status === statusFilter);
    });

    const sortedResults = filteredResults.sort((a, b) => {
        if (resultsSortBy === 'date') {
            return resultsSortOrder === 'asc'
                ? new Date(a.completed_at) - new Date(b.completed_at)
                : new Date(b.completed_at) - new Date(a.completed_at);
        } else if (resultsSortBy === 'score') {
            return resultsSortOrder === 'asc'
                ? a.score - b.score
                : b.score - a.score;
        }
        return 0;
    });

    if (!userInfo) return <p className="loading">Загрузка данных...</p>;

    return (
        <div className="student-container">
            <ToastContainer />
            <LogoutButton />

            {/* Добавленный компонент Recommendations */}
            <Recommendations studentId={userId} />

            <div className="user-info">
                {isEditing ? (
                    <form className="edit-form" onSubmit={handleSubmit}>
                        <label>
                            ФИО:
                            <input
                                type="text"
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleChange}
                            />
                        </label>
                        <label>
                            Телефон:
                            <input
                                type="text"
                                name="phone_number"
                                value={formData.phone_number}
                                onChange={handleChange}
                            />
                        </label>
                        <button type="submit">Сохранить</button>
                        <button type="button" onClick={() => setIsEditing(false)}>Отмена</button>
                    </form>
                ) : (
                    <>
                        <p><strong>ФИО:</strong> {userInfo.full_name}</p>
                        <p><strong>Телефон:</strong> {userInfo.phone_number}</p>
                        <p><strong>Электронная почта:</strong> {userInfo.email}</p>
                        <p><strong>Группа:</strong> {userInfo.group_name}</p>
                        <button onClick={handleEditClick}>Редактировать</button>
                    </>
                )}
            </div>
            <div className="content-wrapper">
                <div className="tests-list">
                    <h2 className="title">Заданные тесты</h2>

                    <div className="filters-row">
                        <input
                            type="text"
                            placeholder="Поиск по названию теста"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="search-input"
                        />

                        <select
                            value={filterStatus}
                            onChange={handleFilterChange}
                            className="filter-select"
                        >
                            <option value="all">Все тесты</option>
                            <option value="available">Доступные для прохождения</option>
                            <option value="completed">Завершенные</option>
                        </select>

                        <select
                            value={topicFilter}
                            onChange={(e) => setTopicFilter(e.target.value)}
                            className="topic-filter-select"
                        >
                            <option value="all">Все темы</option>
                            {[...new Set(testsWithAttempts.map(t => t.topic_name ? t.topic_id : 'no-topic'))]
                                .map(topicId => {
                                    if (topicId === 'no-topic') {
                                        return <option key="no-topic" value="no-topic">Без темы</option>;
                                    }
                                    const topic = testsWithAttempts.find(t => t.topic_id === topicId);
                                    return (
                                        <option key={topicId} value={topicId}>
                                            {topic.topic_name}
                                        </option>
                                    );
                                })}
                        </select>
                    </div>

                    <ul>
                        {filteredTests.map(test => (
                            <li key={test.id}>
                                <div className="test-header">
                                    <h3>{test.title}</h3>
                                    {test.topic_name && (
                                        <span className="topic-tag">{test.topic_name}</span>
                                    )}
                                </div>
                                <p>{test.description}</p>
                                <p>Оставшиеся попытки: {test.attemptsLeft}</p>
                                <button
                                    onClick={() => startTest(test.id)}
                                    disabled={test.attemptsLeft <= 0}
                                    className="button-start"
                                >
                                    Начать тест
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="results-table">
                    <h2 className="title">Мои результаты</h2>
                    <div className="results-filters">
                        <input
                            type="text"
                            placeholder="Поиск по названию теста"
                            value={resultsSearchQuery}
                            onChange={handleResultsSearchChange}
                            className="search-input"
                        />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">Все попытки</option>
                            <option value="completed">Только успешные</option>
                            <option value="failed">Только неудачные</option>
                        </select>
                    </div>

                    <div className="sort-controls">
                        <select
                            value={resultsSortBy}
                            onChange={handleResultsSortChange}
                            className="sort-select"
                        >
                            <option value="date">По дате</option>
                            <option value="score">По результату</option>
                        </select>
                        <button
                            onClick={toggleResultsSortOrder}
                            className="sort-button"
                        >
                            {resultsSortOrder === 'asc' ? '▲' : '▼'}
                        </button>
                    </div>
                    {sortedResults.length > 0 ? (
                        <table>
                            <thead>
                            <tr>
                                <th>Название теста</th>
                                <th>Дата прохождения</th>
                                <th>Результат</th>
                                <th>Статус</th>
                            </tr>
                            </thead>
                            <tbody>
                            {sortedResults.map((result, index) => (
                                <tr key={index}>
                                    <td>{result.test_title}</td>
                                    <td>{new Date(result.completed_at).toLocaleString()}</td>
                                    <td>{result.score}%</td>
                                    <td style={{ color: result.status === 'completed' ? 'green' : 'red' }}>
                                        {result.status === 'completed' ? 'Пройден' : 'Не пройден'}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>Нет данных о результатах тестов.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentPage;
