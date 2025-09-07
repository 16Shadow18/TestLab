import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:3001/login', formData);
            const { role } = response.data;

            const { token } = response.data;
            localStorage.setItem('token', token);

            if (role === 'student') {
                navigate('/student');
            } else if (role === 'teacher') {
                navigate('/teacher');
            } else if (role === 'admin') {
                navigate('/admin');
            }
        } catch (error) {
            console.error('Ошибка авторизации:', error);
            setError('Неправильный email или пароль');
        }
    };

    return (
        <div className="login-container">
            <div className="site-name">TestLab</div>

            {error && <p className="error-message">{error}</p>}
            <form className="login-form" onSubmit={handleSubmit}>
                <div>
                    <label>Email:</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label>Пароль:</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                </div>
                <button type="submit">Войти</button>
            </form>
            <p className="register-link">
                Нет аккаунта? <button onClick={() => navigate('/register')}>Зарегистрироваться</button>
            </p>
            <p className="forgot-password-link">
                <button onClick={() => navigate('/forgot-password')}>Забыли пароль?</button>
            </p>
        </div>
    );
};

export default Login;
