import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Register.css';

const Register = () => {
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        email: '',
        password: '',
        role: 'student',
        group_name: '',
    });

    const [groups, setGroups] = useState([]);
    const navigate = useNavigate();


    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const response = await axios.get('http://localhost:3001/groups');
                setGroups(response.data.map(group => group.name));
            } catch (error) {
                console.error('Ошибка загрузки групп:', error);
                alert('Ошибка загрузки групп');
            }
        };

        fetchGroups();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:3001/register', formData);

            navigate("/login");
        } catch (error) {
            console.error('Ошибка при регистрации:', error);
            alert('Ошибка: ' + (error.response?.data?.message || 'Попробуйте позже.'));
        }
    };

    return (
        <div className="register-container">
            <h1 className="site-name-second">TestLab</h1>

            <form className="register-form" onSubmit={handleSubmit}>
                <div>
                    <label>ФИО:</label>
                    <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label>Номер телефона:</label>
                    <input
                        type="tel"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        required
                    />
                </div>
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
                <div>
                    <label>Роль:</label>
                    <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        required
                    >
                        <option value="student">Студент</option>
                        <option value="teacher">Преподаватель</option>
                    </select>
                </div>
                {formData.role === 'student' && (
                    <div>
                        <label>Группа:</label>
                        <select
                            name="group_name"
                            value={formData.group_name}
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
                )}
                <button type="submit">Зарегистрироваться</button>
            </form>
        </div>
    );
};

export default Register;
