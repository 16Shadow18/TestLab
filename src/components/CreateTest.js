import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/CreateTest.css';

const CreateTest = ({ userId }) => {
    const [testData, setTestData] = useState({
        title: '',
        description: '',
        time_limit: 0,
        attempts_limit: 0,
        group_name: '',
        topic_id: null,
        min_pass_score: 60,
        questions: []
    });
    const [groups, setGroups] = useState([]);
    const navigate = useNavigate();
    const [topics, setTopics] = useState([]);

    useEffect(() => {
        const fetchGroupsAndTopics = async () => {
            try {
                const [groupsResponse, topicsResponse] = await Promise.all([
                    axios.get('http://localhost:3001/groups'),
                    axios.get(`http://localhost:3001/topics?created_by=${userId}`)
                ]);

                setGroups(groupsResponse.data.map(group => group.name));
                setTopics(topicsResponse.data);
            } catch (error) {
                console.error('Ошибка загрузки данных:', error);
            }
        };

        fetchGroupsAndTopics();
    }, [userId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setTestData({ ...testData, [name]: value });
    };

    const handleQuestionChange = (index, e) => {
        const { name, value } = e.target;
        const newQuestions = [...testData.questions];
        newQuestions[index][name] = value;
        setTestData({ ...testData, questions: newQuestions });
    };

    const handleAnswerChange = (questionIndex, answerIndex, e) => {
        const { name, value, type, checked } = e.target;
        const newQuestions = [...testData.questions];
        newQuestions[questionIndex].answers[answerIndex][name] = type === 'checkbox' ? checked : value;
        setTestData({ ...testData, questions: newQuestions });
    };


    const addQuestion = () => {
        setTestData({
            ...testData,
            questions: [
                ...testData.questions,
                {
                    question_text: '',
                    order_number: testData.questions.length + 1,
                    answers: [{ answer_text: '', is_correct: false }]
                }
            ]
        });
    };


    const addAnswer = (questionIndex) => {
        const newQuestions = [...testData.questions];
        newQuestions[questionIndex].answers.push({ answer_text: '', is_correct: false });
        setTestData({ ...testData, questions: newQuestions });
    };


    const deleteQuestion = (questionIndex) => {
        const newQuestions = testData.questions.filter((_, index) => index !== questionIndex);
        setTestData({ ...testData, questions: newQuestions });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:3001/create-test', {
                ...testData,
                created_by: userId
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            navigate('/teacher');
        } catch (error) {
            console.error('Ошибка при создании теста:', error);
            alert('Ошибка при создании теста');
        }
    };

    return (
        <div className="create-test-container">

            <button
                className="back-button"
                onClick={() => navigate('/teacher')}
            >
                Назад
            </button>

            <form onSubmit={handleSubmit}>
                <div>
                    <label>Название теста:</label>
                    <input
                        type="text"
                        name="title"
                        value={testData.title}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label>Описание:</label>
                    <textarea
                        name="description"
                        value={testData.description}
                        onChange={handleChange}
                    />
                </div>
                <div>
                    <label>Лимит времени (в минутах):</label>
                    <input
                        type="number"
                        name="time_limit"
                        value={testData.time_limit}
                        onChange={handleChange}
                    />
                </div>
                <div>
                    <label>Лимит попыток:</label>
                    <input
                        type="number"
                        name="attempts_limit"
                        value={testData.attempts_limit}
                        onChange={handleChange}
                    />
                </div>
                <div>
                    <label>Группа:</label>
                    <select
                        name="group_name"
                        value={testData.group_name}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Выберите группу</option>
                        {groups.map((group, index) => (
                            <option key={index} value={group}>
                                {group}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label>Тема теста:</label>
                    <select
                        name="topic_id"
                        value={testData.topic_id || ''}
                        onChange={handleChange}
                    >
                        <option value="">Без темы</option>
                        {topics.map(topic => (
                            <option key={topic.id} value={topic.id}>
                                {topic.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Минимальный проходной балл (%):</label>
                    <input
                        type="number"
                        name="min_pass_score"
                        min="0"
                        max="100"
                        value={testData.min_pass_score}
                        onChange={handleChange}
                    />
                </div>
                {testData.questions.map((question, qIndex) => (
                    <div key={qIndex} className="question-block">
                        <h3>Вопрос {qIndex + 1}</h3>
                        <button
                            type="button"
                            onClick={() => deleteQuestion(qIndex)}
                            className="delete-question-button"
                        >
                            Удалить вопрос
                        </button>
                        <div>
                            <label>Текст вопроса:</label>
                            <input
                                type="text"
                                name="question_text"
                                value={question.question_text}
                                onChange={(e) => handleQuestionChange(qIndex, e)}
                                required
                            />
                        </div>
                        {question.answers.map((answer, aIndex) => (
                            <div key={aIndex} className="answer-block">
                                <label>Ответ {aIndex + 1}:</label>
                                <input
                                    type="text"
                                    name="answer_text"
                                    value={answer.answer_text}
                                    onChange={(e) => handleAnswerChange(qIndex, aIndex, e)}
                                    required
                                />
                                <label>
                                    <input
                                        type="checkbox"
                                        name="is_correct"
                                        checked={answer.is_correct}
                                        onChange={(e) => handleAnswerChange(qIndex, aIndex, e)}
                                    />
                                    Правильный ответ
                                </label>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => addAnswer(qIndex)}
                            className="add-answer-button"
                        >
                            Добавить ответ
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addQuestion}
                    className="add-question-button"
                >
                    Добавить вопрос
                </button>
                <button type="submit" className="submit-button">
                    Создать тест
                </button>
            </form>
        </div>
    );
};

export default CreateTest;

