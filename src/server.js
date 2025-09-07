const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const secretKey = 'my_super_secret_key_12345!@#$%';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'testlab',
});

db.connect((err) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err);
    } else {
        console.log('Подключение к БД успешно');
    }
});

app.post('/register', (req, res) => {
    const { full_name, phone_number, email, password, role, group_name } = req.body;
    const query = `INSERT INTO users (email, password, full_name, phone_number, role, group_name) 
                  VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(query, [email, password, full_name, phone_number || null, role, group_name || null],  (err, result) => {
        if (err) {
            console.error('Ошибка при регистрации:', err);
            res.status(500).send({ message: 'Ошибка при регистрации' });
        } else {
            res.send({ message: 'Пользователь успешно зарегистрирован' });
        }
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }

        if (results.length === 0) {
            return res.status(401).send({ message: 'Пользователь не найден' });
        }

        const user = results[0];

        if (password === user.password) {
            const token = jwt.sign({ id: user.id, role: user.role }, 'your_secret_key', { expiresIn: '1h' });

            // Отправляем токен и роль обратно на клиент
            res.send({
                message: 'Авторизация успешна',
                token: token,
                role: user.role,
            });
        } else {
            res.status(401).send({ message: 'Неверный пароль' });
        }
    });
});

app.get('/student-info/:userId', (req, res) => {
    const userId = req.params.userId;
    const query = 'SELECT * FROM users WHERE id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }
        if (results.length === 0) {
            return res.status(404).send({ message: 'Пользователь не найден' });
        }

        res.send(results[0]);
    });
});

app.post('/create-test', (req, res) => {
    const { title, description, time_limit, attempts_limit, group_name, created_by, questions, topic_id, min_pass_score } = req.body;
    const testId = uuidv4();

    db.beginTransaction(err => {
        if (err) {
            console.error('Ошибка начала транзакции:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }

        const testQuery = `INSERT INTO tests (id, title, description, time_limit, attempts_limit, group_name, created_by, topic_id, min_pass_score) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.query(testQuery,  [testId, title, description, time_limit, attempts_limit, group_name, created_by, topic_id || null, min_pass_score || 60.00],  (err, result) => {
            if (err) {
                db.rollback(() => {
                    console.error('Ошибка при создании теста:', err);
                    res.status(500).send({ message: 'Ошибка при создании теста' });
                });
                return;
            }

            const questionQueries = questions.map((question, index) => {
                return new Promise((resolve, reject) => {
                    const questionId = uuidv4();
                    const questionQuery = `INSERT INTO questions (id, test_id, question_text, order_number) VALUES (?, ?, ?, ?)`;
                    db.query(questionQuery, [questionId, testId, question.question_text, question.order_number], (err, result) => {
                        if (err) {
                            return reject(err);
                        }

                        const answerQueries = question.answers.map(answer => {
                            return new Promise((resolve, reject) => {
                                const answerId = uuidv4();
                                const answerQuery = `INSERT INTO answers (id, question_id, answer_text, is_correct) VALUES (?, ?, ?, ?)`;
                                db.query(answerQuery, [answerId, questionId, answer.answer_text, answer.is_correct], (err, result) => {
                                    if (err) {
                                        return reject(err);
                                    }
                                    resolve();
                                });
                            });
                        });

                        Promise.all(answerQueries)
                            .then(() => resolve())
                            .catch(err => reject(err));
                    });
                });
            });

            Promise.all(questionQueries)
                .then(() => {
                    db.commit(err => {
                        if (err) {
                            db.rollback(() => {
                                console.error('Ошибка коммита транзакции:', err);
                                res.status(500).send({ message: 'Ошибка сервера' });
                            });
                            return;
                        }
                        res.send({ message: 'Тест успешно создан' });
                    });
                })
                .catch(err => {
                    db.rollback(() => {
                        console.error('Ошибка при создании вопросов или ответов:', err);
                        res.status(500).send({ message: 'Ошибка при создании теста' });
                    });
                });
        });
    });
});
app.get('/tests-for-student/:groupId', (req, res) => {
    const groupId = req.params.groupId;
    const query = `
        SELECT t.*, tp.name AS topic_name
        FROM tests t
        LEFT JOIN topics tp ON t.topic_id = tp.id
        WHERE t.group_name = ?
    `;
    db.query(query, [groupId], (err, results) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }
        res.send(results);
    });
});


app.get('/attempts-count/:testId/:studentId', (req, res) => {
    const { testId, studentId } = req.params;
    const query = `
        SELECT COUNT(*) AS attempts_count 
        FROM test_attempts 
        WHERE test_id = ? AND student_id = ?
    `;
    db.query(query, [testId, studentId], (err, results) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }
        res.send({ attempts_count: results[0].attempts_count });
    });
});
app.get('/test/:testId', (req, res) => {
    const testId = req.params.testId;
    //console.log("Запрос данных теста с ID:", testId);

    const query = `
        SELECT t.id, t.title, t.description, t.time_limit, t.attempts_limit, t.group_name, 
               t.topic_id, tp.name as topic_name, t.min_pass_score
        FROM tests t
        LEFT JOIN topics tp ON t.topic_id = tp.id
        WHERE t.id = ?
    `;
    db.query(query, [testId], (err, results) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }
        if (results.length === 0) {
            console.log("Тест не найден");
            return res.status(404).send({ message: 'Тест не найден' });
        }

        //console.log("Данные теста:", results[0]);
        res.send(results[0]);
    });
});

app.get('/test/:testId/questions', (req, res) => {
    const testId = req.params.testId;

    const query = `
        SELECT q.id AS question_id, q.question_text, a.id AS answer_id, a.answer_text, a.is_correct
        FROM questions q
        LEFT JOIN answers a ON q.id = a.question_id
        WHERE q.test_id = ?
        ORDER BY q.order_number
    `;

    db.query(query, [testId], (err, results) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }

        const questions = results.reduce((acc, row) => {
            if (!acc[row.question_id]) {
                acc[row.question_id] = {
                    id: row.question_id,
                    question_text: row.question_text,
                    answers: []
                };
            }
            if (row.answer_id) {
                acc[row.question_id].answers.push({
                    id: row.answer_id,
                    answer_text: row.answer_text,
                    is_correct: row.is_correct
                });
            }
            return acc;
        }, {});

        res.send(Object.values(questions));
    });
});

app.post('/start-test-attempt', (req, res) => {
    const { testId, studentId } = req.body;
    const attemptId = uuidv4();

    const query = `
        INSERT INTO test_attempts (id, test_id, student_id, status)
        VALUES (?, ?, ?, 'in_progress')
    `;
    db.query(query, [attemptId, testId, studentId], (err, result) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }
        res.send({ attemptId });
    });
});

app.post('/submit-test', (req, res) => {
    const { attemptId, answers } = req.body;

    db.beginTransaction(err => {
        if (err) {
            console.error('Ошибка начала транзакции:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }

        const insertAnswersQuery = `
            INSERT INTO student_answers (id, attempt_id, question_id, answer_id)
            VALUES ?
        `;
        const values = answers.map(answer => [uuidv4(), attemptId, answer.questionId, answer.answerId]);

        db.query(insertAnswersQuery, [values], (err, result) => {
            if (err) {
                db.rollback(() => {
                    console.error('Ошибка запроса:', err);
                    res.status(500).send({ message: 'Ошибка сервера' });
                });
                return;
            }

            const calculateScoreQuery = `
                SELECT COUNT(*) AS correct_answers
                FROM student_answers sa
                JOIN answers a ON sa.answer_id = a.id
                WHERE sa.attempt_id = ? AND a.is_correct = TRUE
            `;

            db.query(calculateScoreQuery, [attemptId], (err, results) => {
                if (err) {
                    db.rollback(() => {
                        console.error('Ошибка запроса:', err);
                        res.status(500).send({ message: 'Ошибка сервера' });
                    });
                    return;
                }

                const correctAnswers = results[0].correct_answers;

                const totalQuestionsQuery = `
                    SELECT COUNT(*) AS total_questions, 
                           (SELECT min_pass_score FROM tests WHERE id = (SELECT test_id FROM test_attempts WHERE id = ?)) AS min_pass_score
                    FROM questions
                    WHERE test_id = (SELECT test_id FROM test_attempts WHERE id = ?)
                `;

                db.query(totalQuestionsQuery, [attemptId, attemptId], (err, results) => {
                    if (err) {
                        db.rollback(() => {
                            console.error('Ошибка запроса:', err);
                            res.status(500).send({ message: 'Ошибка сервера' });
                        });
                        return;
                    }

                    const totalQuestions = results[0].total_questions;
                    const minPassScore = results[0].min_pass_score || 60; // Значение по умолчанию 60%

                    const score = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(2) : 0;
                    const status = score >= minPassScore ? 'completed' : 'failed';

                    const updateAttemptQuery = `
                        UPDATE test_attempts
                        SET completed_at = NOW(), 
                            status = ?,
                            score = ?
                        WHERE id = ?
                    `;

                    db.query(updateAttemptQuery, [status, score, attemptId], (err, result) => {
                        if (err) {
                            db.rollback(() => {
                                console.error('Ошибка запроса:', err);
                                res.status(500).send({ message: 'Ошибка сервера' });
                            });
                            return;
                        }

                        db.commit(err => {
                            if (err) {
                                db.rollback(() => {
                                    console.error('Ошибка коммита транзакции:', err);
                                    res.status(500).send({ message: 'Ошибка сервера' });
                                });
                                return;
                            }
                            res.send({
                                message: 'Тест успешно завершен',
                                score,
                                status: status === 'completed' ? 'Пройден' : 'Не пройден'
                            });
                        });
                    });
                });
            });
        });
    });
});

app.get('/active-attempt/:testId/:studentId', (req, res) => {
    const { testId, studentId } = req.params;
    const query = `
        SELECT id AS attemptId 
        FROM test_attempts 
        WHERE test_id = ? AND student_id = ? AND status = 'in_progress'
    `;
    db.query(query, [testId, studentId], (err, results) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }
        if (results.length > 0) {
            res.send({ attemptId: results[0].attemptId });
        } else {
            res.send({ attemptId: null });
        }
    });
});


app.get('/teacher-test-results/:teacherId', (req, res) => {
    const teacherId = req.params.teacherId;

    const query = `
        SELECT 
            u.full_name,
            u.group_name,
            t.title AS test_title,
            tp.name AS topic_name,
            ta.score,
            ta.status,
            ta.completed_at
        FROM test_attempts ta
        JOIN users u ON ta.student_id = u.id
        JOIN tests t ON ta.test_id = t.id
        LEFT JOIN topics tp ON t.topic_id = tp.id
        WHERE t.created_by = ? AND ta.completed_at IS NOT NULL
        ORDER BY ta.completed_at DESC
    `;

    db.query(query, [teacherId], (err, results) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }
        res.send(results);
    });
});


app.put('/update-user-info/:userId', (req, res) => {
    const userId = req.params.userId;
    const { full_name, phone_number, group_name } = req.body;

    const query = `
        UPDATE users 
        SET full_name = ?, phone_number = ?, group_name = ?
        WHERE id = ?
    `;

    db.query(query, [full_name, phone_number, group_name, userId], (err, result) => {
        if (err) {
            console.error('Ошибка при обновлении информации:', err);
            return res.status(500).send({ message: 'Ошибка при обновлении информации' });
        }
        res.send({ message: 'Информация успешно обновлена' });
    });
});

app.get('/student-test-results/:studentId', (req, res) => {
    const studentId = req.params.studentId;

    const query = `
        SELECT 
            t.title AS test_title,
            ta.completed_at,
            ta.score,
            ta.status
        FROM test_attempts ta
        JOIN tests t ON ta.test_id = t.id
        WHERE ta.student_id = ? AND ta.completed_at IS NOT NULL
        ORDER BY ta.completed_at DESC
    `;

    db.query(query, [studentId], (err, results) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }
        res.send(results);
    });
});

app.delete('/delete-test/:testId', (req, res) => {
    const testId = req.params.testId;


    db.beginTransaction(err => {
        if (err) {
            console.error('Ошибка начала транзакции:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }


        const deleteAnswersQuery = `
            DELETE FROM answers
            WHERE question_id IN (SELECT id FROM questions WHERE test_id = ?)
        `;
        db.query(deleteAnswersQuery, [testId], (err, result) => {
            if (err) {
                db.rollback(() => {
                    console.error('Ошибка удаления ответов:', err);
                    res.status(500).send({ message: 'Ошибка сервера' });
                });
                return;
            }


            const deleteQuestionsQuery = `
                DELETE FROM questions
                WHERE test_id = ?
            `;
            db.query(deleteQuestionsQuery, [testId], (err, result) => {
                if (err) {
                    db.rollback(() => {
                        console.error('Ошибка удаления вопросов:', err);
                        res.status(500).send({ message: 'Ошибка сервера' });
                    });
                    return;
                }


                const deleteTestQuery = `
                    DELETE FROM tests
                    WHERE id = ?
                `;
                db.query(deleteTestQuery, [testId], (err, result) => {
                    if (err) {
                        db.rollback(() => {
                            console.error('Ошибка удаления теста:', err);
                            res.status(500).send({ message: 'Ошибка сервера' });
                        });
                        return;
                    }


                    db.commit(err => {
                        if (err) {
                            db.rollback(() => {
                                console.error('Ошибка коммита транзакции:', err);
                                res.status(500).send({ message: 'Ошибка сервера' });
                            });
                            return;
                        }
                        res.send({ message: 'Тест успешно удален' });
                    });
                });
            });
        });
    });
});

app.get('/teacher-tests/:teacherId', (req, res) => {
    const teacherId = req.params.teacherId;

    const query = `
        SELECT t.id, t.title, t.description, t.time_limit, t.attempts_limit, 
               t.group_name, t.min_pass_score, tp.id as topic_id, tp.name as topic_name
        FROM tests t
        LEFT JOIN topics tp ON t.topic_id = tp.id
        WHERE t.created_by = ?
        ORDER BY t.created_at DESC
    `;

    db.query(query, [teacherId], (err, results) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }
        res.send(results);
    });
});

app.get('/users', (req, res) => {
    const query = `
        SELECT id, full_name, phone_number, email, role, group_name
        FROM users
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }
        res.send(results);
    });
});

app.put('/update-user-role/:userId', (req, res) => {
    const userId = req.params.userId;
    const { role, group_name } = req.body;

    const query = `
        UPDATE users
        SET role = ?, group_name = ?
        WHERE id = ?
    `;

    db.query(query, [role, group_name || null, userId], (err, result) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }
        res.send({ message: 'Роль и группа пользователя успешно обновлены' });
    });
});

app.get('/groups', (req, res) => {
    const query = `
        SELECT name
        FROM groups
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }
        res.send(results);
    });
});

app.post('/create-group', (req, res) => {
    const { name } = req.body;

    const query = 'INSERT INTO groups (name) VALUES (?)';
    db.query(query, [name], (err, result) => {
        if (err) {
            console.error('Ошибка при создании группы:', err);
            return res.status(500).send({ message: 'Ошибка при создании группы' });
        }
        res.send({ message: 'Группа успешно создана' });
    });
});

// Редактирование группы
app.put('/update-group/:groupName', (req, res) => {
    const { groupName } = req.params;
    const { newName } = req.body;

    const query = 'UPDATE groups SET name = ? WHERE name = ?';
    db.query(query, [newName, groupName], (err, result) => {
        if (err) {
            console.error('Ошибка при редактировании группы:', err);
            return res.status(500).send({ message: 'Ошибка при редактировании группы' });
        }
        res.send({ message: 'Группа успешно обновлена' });
    });
});

// Удаление группы
app.delete('/delete-group/:groupName', (req, res) => {
    const { groupName } = req.params;

    const query = 'DELETE FROM groups WHERE name = ?';
    db.query(query, [groupName], (err, result) => {
        if (err) {
            console.error('Ошибка при удалении группы:', err);
            return res.status(500).send({ message: 'Ошибка при удалении группы' });
        }
        res.send({ message: 'Группа успешно удалена' });
    });
});


app.put('/update-test/:testId', (req, res) => {
    const testId = req.params.testId;
    const updatedTest = req.body;

    db.beginTransaction(err => {
        if (err) {
            return res.status(500).send({ message: 'Ошибка сервера' });
        }

        const updateTestQuery = `
            UPDATE tests
            SET title = ?, description = ?, time_limit = ?, attempts_limit = ?, 
                group_name = ?, topic_id = ?, min_pass_score = ?
            WHERE id = ?
        `;

        db.query(updateTestQuery, [
            updatedTest.title,
            updatedTest.description,
            updatedTest.time_limit,
            updatedTest.attempts_limit,
            updatedTest.group_name,
            updatedTest.topic_id || null,
            updatedTest.min_pass_score || 60.00,
            testId,
        ], (err, result) => {
            if (err) {
                db.rollback(() => {
                    res.status(500).send({ message: 'Ошибка обновления теста' });
                });
                return;
            }

            const getCurrentQuestionsQuery = `SELECT id FROM questions WHERE test_id = ?`;
            db.query(getCurrentQuestionsQuery, [testId], (err, currentQuestions) => {
                if (err) {
                    db.rollback(() => {
                        res.status(500).send({ message: 'Ошибка сервера' });
                    });
                    return;
                }

                const currentQuestionIds = currentQuestions.map(q => q.id);
                const updatedQuestionIds = updatedTest.questions.map(q => q.id).filter(id => id);

                const questionsToDelete = currentQuestionIds.filter(id => !updatedQuestionIds.includes(id));
                if (questionsToDelete.length > 0) {
                    const deleteQuestionsQuery = `DELETE FROM questions WHERE id IN (?)`;
                    db.query(deleteQuestionsQuery, [questionsToDelete], (err, result) => {
                        if (err) {
                            db.rollback(() => {
                                res.status(500).send({ message: 'Ошибка сервера' });
                            });
                            return;
                        }
                    });
                }

                const processAnswers = (questionId, answers) => {
                    return new Promise((resolve, reject) => {
                        const getCurrentAnswersQuery = `SELECT id FROM answers WHERE question_id = ?`;
                        db.query(getCurrentAnswersQuery, [questionId], (err, currentAnswers) => {
                            if (err) return reject(err);

                            const currentAnswerIds = currentAnswers.map(a => a.id);
                            const updatedAnswerIds = answers.map(a => a.id).filter(id => id);

                            const answersToDelete = currentAnswerIds.filter(id => !updatedAnswerIds.includes(id));
                            if (answersToDelete.length > 0) {
                                const deleteAnswersQuery = `DELETE FROM answers WHERE id IN (?)`;
                                db.query(deleteAnswersQuery, [answersToDelete], (err) => {
                                    if (err) return reject(err);
                                });
                            }

                            const answerPromises = answers.map(answer => {
                                return new Promise((resolve, reject) => {
                                    if (answer.id) {
                                        const updateAnswerQuery = `
                                            INSERT INTO answers (id, question_id, answer_text, is_correct)
                                            VALUES (?, ?, ?, ?)
                                            ON DUPLICATE KEY UPDATE
                                            answer_text = VALUES(answer_text),
                                            is_correct = VALUES(is_correct)
                                        `;
                                        db.query(updateAnswerQuery, [
                                            answer.id,
                                            questionId,
                                            answer.answer_text,
                                            answer.is_correct || false
                                        ], (err) => {
                                            if (err) return reject(err);
                                            resolve();
                                        });
                                    } else {
                                        const answerId = uuidv4();
                                        const insertAnswerQuery = `
                                            INSERT INTO answers (id, question_id, answer_text, is_correct)
                                            VALUES (?, ?, ?, ?)
                                        `;
                                        db.query(insertAnswerQuery, [
                                            answerId,
                                            questionId,
                                            answer.answer_text,
                                            answer.is_correct || false
                                        ], (err) => {
                                            if (err) return reject(err);
                                            resolve();
                                        });
                                    }
                                });
                            });

                            Promise.all(answerPromises)
                                .then(() => resolve())
                                .catch(err => reject(err));
                        });
                    });
                };

                const updateQuestions = updatedTest.questions.map(question => {
                    return new Promise((resolve, reject) => {
                        if (question.id) {
                            const checkQuestionQuery = `SELECT id FROM questions WHERE id = ?`;
                            db.query(checkQuestionQuery, [question.id], (err, results) => {
                                if (err) return reject(err);

                                if (results.length > 0) {
                                    const updateQuestionQuery = `
                                        UPDATE questions
                                        SET question_text = ?, order_number = ?
                                        WHERE id = ?
                                    `;
                                    db.query(updateQuestionQuery, [
                                        question.question_text,
                                        question.order_number,
                                        question.id,
                                    ], (err) => {
                                        if (err) return reject(err);
                                        processAnswers(question.id, question.answers)
                                            .then(() => resolve())
                                            .catch(err => reject(err));
                                    });
                                } else {
                                    const insertQuestionQuery = `
                                        INSERT INTO questions (id, test_id, question_text, order_number)
                                        VALUES (?, ?, ?, ?)
                                    `;
                                    db.query(insertQuestionQuery, [
                                        question.id,
                                        testId,
                                        question.question_text,
                                        question.order_number,
                                    ], (err) => {
                                        if (err) return reject(err);
                                        processAnswers(question.id, question.answers)
                                            .then(() => resolve())
                                            .catch(err => reject(err));
                                    });
                                }
                            });
                        } else {
                            const questionId = uuidv4();
                            const insertQuestionQuery = `
                                INSERT INTO questions (id, test_id, question_text, order_number)
                                VALUES (?, ?, ?, ?)
                            `;
                            db.query(insertQuestionQuery, [
                                questionId,
                                testId,
                                question.question_text,
                                question.order_number,
                            ], (err) => {
                                if (err) return reject(err);
                                processAnswers(questionId, question.answers)
                                    .then(() => resolve())
                                    .catch(err => reject(err));
                            });
                        }
                    });
                });

                Promise.all(updateQuestions)
                    .then(() => {
                        db.commit(err => {
                            if (err) {
                                db.rollback(() => {
                                    res.status(500).send({ message: 'Ошибка сервера' });
                                });
                                return;
                            }

                            // После успешного обновления получаем полные данные теста
                            const getFullTestQuery = `
                                SELECT 
                                    t.*,
                                    q.id as question_id, 
                                    q.question_text, 
                                    q.order_number,
                                    a.id as answer_id,
                                    a.answer_text,
                                    a.is_correct
                                FROM tests t
                                LEFT JOIN questions q ON q.test_id = t.id
                                LEFT JOIN answers a ON a.question_id = q.id
                                WHERE t.id = ?
                                ORDER BY q.order_number, a.id
                            `;

                            db.query(getFullTestQuery, [testId], (err, results) => {
                                if (err) {
                                    return res.status(500).send({ message: 'Ошибка получения обновленного теста' });
                                }

                                if (results.length === 0) {
                                    return res.status(404).send({ message: 'Тест не найден' });
                                }

                                // Форматируем результаты в структуру, ожидаемую клиентом
                                const formattedTest = {
                                    id: results[0].id,
                                    title: results[0].title,
                                    description: results[0].description,
                                    time_limit: results[0].time_limit,
                                    attempts_limit: results[0].attempts_limit,
                                    group_name: results[0].group_name,
                                    topic_id: results[0].topic_id,
                                    topic_name: results[0].topic_name,
                                    min_pass_score: results[0].min_pass_score,
                                    questions: []
                                };

                                const questionsMap = {};

                                results.forEach(row => {
                                    if (row.question_id && !questionsMap[row.question_id]) {
                                        questionsMap[row.question_id] = {
                                            id: row.question_id,
                                            question_text: row.question_text,
                                            order_number: row.order_number,
                                            answers: []
                                        };

                                        if (row.answer_id) {
                                            questionsMap[row.question_id].answers.push({
                                                id: row.answer_id,
                                                answer_text: row.answer_text,
                                                is_correct: Boolean(row.is_correct)
                                            });
                                        }
                                    } else if (row.question_id && row.answer_id) {
                                        questionsMap[row.question_id].answers.push({
                                            id: row.answer_id,
                                            answer_text: row.answer_text,
                                            is_correct: Boolean(row.is_correct)
                                        });
                                    }
                                });

                                formattedTest.questions = Object.values(questionsMap);

                                res.send(formattedTest);
                            });
                        });
                    })
                    .catch(err => {
                        db.rollback(() => {
                            res.status(500).send({ message: 'Ошибка обновления теста' });
                        });
                    });
            });
        });
    });
});

function processAnswers(questionId, answers) {
    return new Promise((resolve, reject) => {
        const getCurrentAnswersQuery = `SELECT id FROM answers WHERE question_id = ?`;
        db.query(getCurrentAnswersQuery, [questionId], (err, currentAnswers) => {
            if (err) {
                return reject(err);
            }

            const currentAnswerIds = currentAnswers.map(a => a.id);
            const updatedAnswerIds = answers.map(a => a.id).filter(id => id);

            const answersToDelete = currentAnswerIds.filter(id => !updatedAnswerIds.includes(id));
            if (answersToDelete.length > 0) {
                const deleteAnswersQuery = `DELETE FROM answers WHERE id IN (?)`;
                db.query(deleteAnswersQuery, [answersToDelete], (err, result) => {
                    if (err) {
                        return reject(err);
                    }
                });
            }

            const updateAnswers = answers.map(answer => {
                return new Promise((resolve, reject) => {
                    const isCorrect = answer.is_correct ? 1 : 0;

                    if (answer.id) {
                        const checkAnswerQuery = `SELECT id FROM answers WHERE id = ?`;
                        db.query(checkAnswerQuery, [answer.id], (err, results) => {
                            if (err) {
                                return reject(err);
                            }

                            if (results.length > 0) {
                                const updateAnswerQuery = `
                                    UPDATE answers
                                    SET answer_text = ?, is_correct = ?
                                    WHERE id = ?
                                `;
                                db.query(updateAnswerQuery, [
                                    answer.answer_text,
                                    isCorrect,
                                    answer.id,
                                ], (err, result) => {
                                    if (err) {
                                        return reject(err);
                                    }
                                    resolve();
                                });
                            } else {
                                const insertAnswerQuery = `
                                    INSERT INTO answers (id, question_id, answer_text, is_correct)
                                    VALUES (?, ?, ?, ?)
                                `;
                                db.query(insertAnswerQuery, [
                                    answer.id,
                                    questionId,
                                    answer.answer_text,
                                    isCorrect,
                                ], (err, result) => {
                                    if (err) {
                                        return reject(err);
                                    }
                                    resolve();
                                });
                            }
                        });
                    } else {
                        const insertAnswerQuery = `
                            INSERT INTO answers (id, question_id, answer_text, is_correct)
                            VALUES (?, ?, ?, ?)
                        `;
                        db.query(insertAnswerQuery, [
                            uuidv4(),
                            questionId,
                            answer.answer_text,
                            isCorrect,
                        ], (err, result) => {
                            if (err) {
                                return reject(err);
                            }
                            resolve();
                        });
                    }
                });
            });

            Promise.all(updateAnswers)
                .then(() => resolve())
                .catch(err => reject(err));
        });
    });
}


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'semenovakate999@gmail.com',
        pass: 'nljp lpia xcxg hkyz'
    }
});


const sendResetEmail = (email, token) => {
    const mailOptions = {
        from: 'semenovakate999@gmail.com',
        to: email,
        subject: 'Сброс пароля',
        text: `Для сброса пароля перейдите по ссылке: http://localhost:3000/reset-password/${token}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Ошибка отправки письма:', error);
        } else {
            console.log('Письмо отправлено:', info.response);
        }
    });
};


app.post('/request-password-reset', (req, res) => {
    const { email } = req.body;


    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }

        if (results.length === 0) {
            return res.status(404).send({ message: 'Пользователь с таким email не найден' });
        }


        const user = results[0];
        const token = jwt.sign({ id: user.id }, secretKey, { expiresIn: '1h' });


        sendResetEmail(email, token);

        res.send({ message: 'Письмо с инструкциями по сбросу пароля отправлено на ваш email' });
    });
});



app.post('/reset-password', (req, res) => {
    const { token, newPassword } = req.body;

    try {

        const decoded = jwt.verify(token, secretKey);
        const userId = decoded.id;

        const query = 'UPDATE users SET password = ? WHERE id = ?';
        db.query(query, [newPassword, userId], (err, result) => {
            if (err) {
                console.error('Ошибка запроса:', err);
                return res.status(500).send({ message: 'Ошибка сервера' });
            }

            res.send({ message: 'Пароль успешно обновлен' });
        });
    } catch (error) {
        console.error('Ошибка верификации токена:', error);
        res.status(400).send({ message: 'Неверный или истекший токен' });
    }
});



app.get('/test-statistics-distribution/:testId', (req, res) => {
    const testId = req.params.testId;

    const query = `
        SELECT 
            CASE
                WHEN ta.score > 85 THEN '>85%'
                WHEN ta.score > 70 THEN '>70%'
                WHEN ta.score > 50 THEN '>50%'
                ELSE '<50%'
            END AS score_range,
            COUNT(*) AS count
        FROM test_attempts ta
        WHERE ta.test_id = ? AND ta.status = 'completed'
        GROUP BY score_range
        ORDER BY score_range DESC
    `;

    db.query(query, [testId], (err, results) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }
        res.send(results);
    });
});


app.get('/test-question-statistics/:testId', (req, res) => {
    const testId = req.params.testId;

    const query = `
        SELECT 
            q.id AS question_id,
            q.question_text,
            COUNT(CASE WHEN a.is_correct = TRUE THEN 1 END) AS correct_answers,
            COUNT(CASE WHEN a.is_correct = FALSE THEN 1 END) AS incorrect_answers
        FROM questions q
        LEFT JOIN answers a ON q.id = a.question_id
        LEFT JOIN student_answers sa ON a.id = sa.answer_id
        WHERE q.test_id = ?
        GROUP BY q.id
    `;

    db.query(query, [testId], (err, results) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }
        res.send(results);
    });
});


app.post('/topics', (req, res) => {
    const { name, created_by } = req.body;

    const query = 'INSERT INTO topics (name, created_by) VALUES (?, ?)';
    db.query(query, [name, created_by], async (err, result) => {
        if (err) {
            console.error('Ошибка при создании темы:', err);
            return res.status(500).send({ message: 'Ошибка при создании темы' });
        }

        // Получаем только что созданную тему
        const getQuery = 'SELECT * FROM topics WHERE id = ?';
        db.query(getQuery, [result.insertId], (err, topicResult) => {
            if (err || topicResult.length === 0) {
                console.error('Ошибка при получении темы:', err);
                return res.status(500).send({ message: 'Ошибка при получении данных темы' });
            }

            res.send({
                message: 'Тема успешно создана',
                topic: topicResult[0] // Отправляем полные данные темы
            });
        });
    });
});


app.get('/topics', (req, res) => {
    const { created_by } = req.query; // Добавляем параметр запроса

    let query = 'SELECT id, name, created_by FROM topics';
    const params = [];

    if (created_by) {
        query += ' WHERE created_by = ?';
        params.push(created_by);
    }

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }
        res.send(results);
    });
});

app.delete('/topics/:id', (req, res) => {
    const topicId = req.params.id;

    const query = 'DELETE FROM topics WHERE id = ?';
    db.query(query, [topicId], (err, result) => {
        if (err) {
            console.error('Ошибка при удалении темы:', err);
            return res.status(500).send({ message: 'Ошибка при удалении темы' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).send({ message: 'Тема не найдена' });
        }

        res.send({ message: 'Тема успешно удалена' });
    });
});

app.get('/test/:testId/topic', (req, res) => {
    const testId = req.params.testId;

    const query = `
        SELECT t.id, t.name 
        FROM topics t
        JOIN tests ts ON t.id = ts.topic_id
        WHERE ts.id = ?
    `;

    db.query(query, [testId], (err, results) => {
        if (err) {
            console.error('Ошибка запроса:', err);
            return res.status(500).send({ message: 'Ошибка сервера' });
        }

        if (results.length === 0) {
            return res.send(null);
        }

        res.send(results[0]);
    });
});

// Получение рекомендаций для студента - полная версия
app.get('/recommendations/:studentId', async (req, res) => {
    const studentId = req.params.studentId;

    try {
        // Генерируем новые рекомендации
        const recommendations = await generateRecommendations(studentId);

        // Удаляем старые рекомендации в транзакции
        await new Promise((resolve, reject) => {
            db.beginTransaction(err => {
                if (err) return reject(err);

                db.query('DELETE FROM recommendations WHERE student_id = ?', [studentId], (err) => {
                    if (err) return db.rollback(() => reject(err));

                    if (recommendations.length > 0) {
                        const values = recommendations.map(rec => [
                            studentId,
                            rec.test_id,
                            rec.type,
                            rec.message || '' // Защита от undefined
                        ]);

                        db.query(
                            'INSERT INTO recommendations (student_id, test_id, type, message) VALUES ?',
                            [values],
                            (err) => {
                                if (err) return db.rollback(() => reject(err));
                                db.commit(err => {
                                    if (err) return db.rollback(() => reject(err));
                                    resolve();
                                });
                            }
                        );
                    } else {
                        db.commit(err => {
                            if (err) return db.rollback(() => reject(err));
                            resolve();
                        });
                    }
                });
            });
        });

        res.send(recommendations);
    } catch (error) {
        console.error('Ошибка обработки рекомендаций:', error);
        res.status(500).send({
            message: 'Ошибка генерации рекомендаций',
            details: error.message
        });
    }
});

async function generateRecommendations(studentId) {
    try {
        const recommendations = [];

        // Параллельно запрашиваем все нужные данные
        const [
            unfinishedTests,
            weakTopics,
            inactiveTests,
            testFrequency,
            failedTests,
            avgScore
        ] = await Promise.all([
            query(`
                SELECT t.id, t.title 
                FROM test_attempts ta
                JOIN tests t ON ta.test_id = t.id
                WHERE ta.student_id = ? AND ta.status = 'in_progress'
            `, [studentId]),

            query(`
                SELECT t.id AS test_id, t.title, tp.name AS topic_name,
                       AVG(ta.score) AS avg_score
                FROM test_attempts ta
                JOIN tests t ON ta.test_id = t.id
                JOIN topics tp ON t.topic_id = tp.id
                WHERE ta.student_id = ? AND ta.status = 'completed'
                GROUP BY t.topic_id
                HAVING avg_score < 60
                ORDER BY avg_score ASC
                LIMIT 3
            `, [studentId]),

            query(`
                SELECT t.id, t.title, 
                       DATEDIFF(NOW(), MAX(ta.completed_at)) AS days_inactive
                FROM tests t
                LEFT JOIN test_attempts ta ON t.id = ta.test_id AND ta.student_id = ?
                WHERE t.group_name = (SELECT group_name FROM users WHERE id = ?)
                GROUP BY t.id
                HAVING days_inactive > 30 OR days_inactive IS NULL
                ORDER BY days_inactive DESC
                LIMIT 2
            `, [studentId, studentId]),

            query(`
                SELECT 
                    COUNT(*) AS test_count,
                    DATEDIFF(MAX(completed_at), MIN(completed_at)) AS days_period
                FROM test_attempts 
                WHERE student_id = ? AND status = 'completed'
            `, [studentId]),

            query(`
                SELECT t.id, t.title, COUNT(*) AS fail_count
                FROM test_attempts ta
                JOIN tests t ON ta.test_id = t.id
                WHERE ta.student_id = ? 
                AND ta.status = 'failed'
                AND NOT EXISTS (
                    SELECT 1 FROM test_attempts 
                    WHERE test_id = t.id 
                    AND student_id = ?
                    AND status = 'completed'
                    AND score >= t.min_pass_score
                )
                GROUP BY ta.test_id
                HAVING fail_count >= 2
                ORDER BY fail_count DESC
                LIMIT 2
            `, [studentId, studentId]),

            query(`
                SELECT AVG(score) AS avg_score 
                FROM test_attempts 
                WHERE student_id = ? AND status = 'completed'
            `, [studentId])
        ]);

        // Обрабатываем результаты
        unfinishedTests.forEach(test => {
            recommendations.push({
                test_id: test.id,
                type: 'unfinished',
                message: `У вас есть незавершенная попытка теста "${test.title}"`
            });
        });

        weakTopics.forEach(test => {
            recommendations.push({
                test_id: test.test_id,
                type: 'weak_topic',
                message: `Повторите тему "${test.topic_name}" - ваш средний балл ${test.avg_score.toFixed(1)}%`
            });
        });

        inactiveTests.forEach(test => {
            const days = test.days_inactive || 'более 30';
            recommendations.push({
                test_id: test.id,
                type: 'inactivity',
                message: `Вы не проходили тест "${test.title}" ${days} дней`
            });
        });

        if (testFrequency[0].test_count > 0 && (testFrequency[0].test_count / testFrequency[0].days_period) < 0.1) {
            const testsToRecommend = await query(`
                SELECT t.id, t.title
                FROM tests t
                WHERE t.group_name = (SELECT group_name FROM users WHERE id = ?)
                AND t.id NOT IN (
                    SELECT test_id FROM test_attempts 
                    WHERE student_id = ?
                )
                LIMIT 2
            `, [studentId, studentId]);

            testsToRecommend.forEach(test => {
                recommendations.push({
                    test_id: test.id,
                    type: 'frequency',
                    message: `Рекомендуем пройти тест "${test.title}" (вы редко тестируетесь)`
                });
            });
        }

        failedTests.forEach(test => {
            recommendations.push({
                test_id: test.id,
                type: 'failed_attempts',
                message: `Попробуйте снова тест "${test.title}" (неудачных попыток: ${test.fail_count})`
            });
        });

        if (avgScore[0].avg_score !== null && avgScore[0].avg_score < 50) {
            const testsToImprove = await query(`
                SELECT t.id, t.title
                FROM tests t
                WHERE t.group_name = (SELECT group_name FROM users WHERE id = ?)
                AND t.id NOT IN (
                    SELECT test_id FROM test_attempts 
                    WHERE student_id = ? AND status = 'completed' AND score >= t.min_pass_score
                )
                ORDER BY RAND()
                LIMIT 2
            `, [studentId, studentId]);

            testsToImprove.forEach(test => {
                recommendations.push({
                    test_id: test.id,
                    type: 'average_score',
                    message: `Попробуйте тест "${test.title}" (ваш средний балл ${avgScore[0].avg_score.toFixed(1)}%)`
                });
            });
        }

        return recommendations;
    } catch (error) {
        console.error('Ошибка генерации рекомендаций:', error);
        throw error;
    }
}



// Общая функция для выполнения SQL-запросов
function query(sql, params) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

app.listen(3001, () => {
    console.log('Сервер запущен на порту 3001');
});
