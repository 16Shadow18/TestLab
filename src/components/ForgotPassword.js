import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/ForgotPassword.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:3001/request-password-reset', { email });
            setMessage(response.data.message);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Ошибка при запросе сброса пароля');
        }
    };

    return (
        <div className="forgot-password-container">
            <h2>Забыли пароль?</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Email:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Отправить</button>
            </form>
            {message && <p className="message">{message}</p>}
            <button onClick={() => navigate('/login')}>Вернуться к входу</button>
        </div>
    );
};

export default ForgotPassword;
