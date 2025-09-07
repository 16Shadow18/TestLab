import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import '../styles/TestPage.css';

const TestPage = ({ userId }) => {
    const { testId } = useParams();
    const navigate = useNavigate();
    const [test, setTest] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [attemptId, setAttemptId] = useState(null);
    const [score, setScore] = useState(null);

    useEffect(() => {
        const fetchTestData = async () => {
            try {
                const testResponse = await axios.get(`http://localhost:3001/test/${testId}`);
                setTest(testResponse.data);

                const questionsResponse = await axios.get(`http://localhost:3001/test/${testId}/questions`);
                setQuestions(questionsResponse.data);

                const timeLimit = testResponse.data.time_limit * 60;
                setTimeLeft(timeLimit);

                const activeAttemptResponse = await axios.get(`http://localhost:3001/active-attempt/${testId}/${userId}`);
                if (activeAttemptResponse.data.attemptId) {
                    setAttemptId(activeAttemptResponse.data.attemptId);
                } else {
                    const attemptResponse = await axios.post('http://localhost:3001/start-test-attempt', {
                        testId,
                        studentId: userId
                    });
                    setAttemptId(attemptResponse.data.attemptId);
                }
            } catch (error) {
                console.error('Ошибка загрузки теста:', error);
                navigate('/student');
            }
        };

        fetchTestData();
    }, [testId, userId, navigate]);

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prevTime => Math.max(prevTime - 1, 0));
            }, 1000);

            return () => clearInterval(timer);
        } else if (timeLeft === 0 && attemptId) {
            submitTest();
        }
    }, [timeLeft, attemptId]);

    const handleAnswerChange = (questionId, answerId) => {
        setAnswers(prevAnswers => ({
            ...prevAnswers,
            [questionId]: answerId
        }));
    };

    const submitTest = async () => {
        try {
            if (!attemptId) {
                console.error('Ошибка: attemptId не найден');
                return;
            }

            // Формируем ответы
            const allAnswers = questions.map(question => ({
                questionId: question.id,
                answerId: answers[question.id] || null
            }));

            const response = await axios.post('http://localhost:3001/submit-test', {
                attemptId,
                answers: allAnswers
            });

            setScore(response.data.score);

            // После успешной отправки обновляем рекомендации
            await axios.get(`http://localhost:3001/recommendations/${userId}`);

        } catch (error) {
            console.error('Ошибка отправки теста:', error);
        }
    };

    if (score !== null) {
        return (
            <div className="result-container">
                <h1>Результат теста</h1>
                <p>Ваш результат: {score}%</p>
                <p>Статус: {score >= test.min_pass_score ? 'Тест пройден' : 'Тест не пройден'}</p>
                <button
                    className="back-button"
                    onClick={() => navigate('/student')}
                >
                    Вернуться в личный кабинет
                </button>
            </div>
        );
    }

    if (!test || !questions.length) return <p>Загрузка теста...</p>;

    return (
        <div className="test-container">
            <h1>{test.title}</h1>
            <p className="test-description">{test.description}</p>
            <p className="timer">Оставшееся время: {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? `0${timeLeft % 60}` : timeLeft % 60}</p>

            {questions.map(question => (
                <div key={question.id} className="question-block">
                    <h3>{question.question_text}</h3>
                    {question.answers.map(answer => (
                        <div key={answer.id} className="answer-block">
                            <label>
                                <input
                                    type="radio"
                                    name={`question-${question.id}`}
                                    value={answer.id}
                                    onChange={() => handleAnswerChange(question.id, answer.id)}
                                />
                                {answer.answer_text}
                            </label>
                        </div>
                    ))}
                </div>
            ))}

            <button
                className="submit-button"
                onClick={submitTest}
            >
                Завершить тест
            </button>
        </div>
    );
};

export default TestPage;
