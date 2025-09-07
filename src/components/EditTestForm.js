import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const EditTestForm = ({ test, onSave, onClose, userId }) => {
    const [testData, setTestData] = useState({
        title: test.title || '',
        description: test.description || '',
        time_limit: test.time_limit || 0,
        attempts_limit: test.attempts_limit || 0,
        group_name: test.group_name || '',
        topic_id: null, // Временно null, загрузим ниже
        min_pass_score: test.min_pass_score || 60,
        questions: test.questions || [],
    });

    const [topics, setTopics] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Загружаем группы
                const groupsResponse = await axios.get('http://localhost:3001/groups');
                setGroups(groupsResponse.data.map(group => group.name));

                // 2. Загружаем все темы преподавателя
                const topicsResponse = await axios.get(`http://localhost:3001/topics?created_by=${userId}`);
                setTopics(topicsResponse.data);

                // 3. Загружаем тему текущего теста (если есть)
                const topicResponse = await axios.get(`http://localhost:3001/test/${test.id}/topic`);

                // Обновляем состояние
                setTestData(prev => ({
                    ...prev,
                    topic_id: topicResponse.data?.id || null
                }));

                setLoading(false);
            } catch (error) {
                console.error('Ошибка загрузки данных:', error);
                setLoading(false);
            }
        };

        fetchData();
    }, [test.id, userId]);

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
                    id: uuidv4(),
                    question_text: '',
                    order_number: testData.questions.length + 1,
                    answers: [{ id: uuidv4(), answer_text: '', is_correct: false }],
                },
            ],
        });
    };

    const addAnswer = (questionIndex) => {
        const newQuestions = [...testData.questions];
        newQuestions[questionIndex].answers.push({ id: uuidv4(), answer_text: '', is_correct: false });
        setTestData({ ...testData, questions: newQuestions });
    };

    const deleteQuestion = (questionIndex) => {
        const newQuestions = testData.questions.filter((_, index) => index !== questionIndex);
        setTestData({ ...testData, questions: newQuestions });
    };

    const deleteAnswer = (questionIndex, answerIndex) => {
        const newQuestions = [...testData.questions];
        newQuestions[questionIndex].answers = newQuestions[questionIndex].answers.filter(
            (_, index) => index !== answerIndex
        );
        setTestData({ ...testData, questions: newQuestions });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...testData,
            id: test.id,
            topic_id: testData.topic_id || null
        });
    };

    if (loading) {
        return <div>Загрузка данных...</div>;
    }

    return (
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
                <label>Тема:</label>
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

            {testData.questions.map((question, qIndex) => (
                <div key={question.id} className="question-block">
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
                        <div key={answer.id} className="answer-block">
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
                            <button
                                type="button"
                                onClick={() => deleteAnswer(qIndex, aIndex)}
                                className="delete-answer-button"
                            >
                                Удалить ответ
                            </button>
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

            <button type="button" onClick={addQuestion} className="add-question-button">
                Добавить вопрос
            </button>

            <div className="modal-buttons">
                <button type="submit" className="save-button">
                    Сохранить
                </button>
                <button type="button" onClick={onClose} className="cancel-button">
                    Отмена
                </button>
            </div>
        </form>
    );
};

export default EditTestForm;
