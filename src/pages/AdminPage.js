import React, { useEffect, useState } from 'react';
import axios from 'axios';
import LogoutButton from '../components/LogoutButton';
import '../styles/AdminPage.css';

const AdminPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [groupName, setGroupName] = useState('');
    const [groups, setGroups] = useState([]);
    const [roleFilter, setRoleFilter] = useState('all');
    const [newGroupName, setNewGroupName] = useState('');
    const [editingGroup, setEditingGroup] = useState(null);
    const [editedGroupName, setEditedGroupName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('asc');


    useEffect(() => {
        const fetchData = async () => {
            try {
                const usersResponse = await axios.get('http://localhost:3001/users');
                setUsers(usersResponse.data);

                const groupsResponse = await axios.get('http://localhost:3001/groups');
                setGroups(groupsResponse.data.map(group => group.name));

                setLoading(false);
            } catch (error) {
                console.error('Ошибка загрузки данных:', error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const filteredUsers = users.filter(user => {
        if (roleFilter === 'all') {
            return true;
        }
        return user.role === roleFilter;
    });

    const handleRoleChange = async (userId, newRole) => {
        const user = users.find(user => user.id === userId);

        if (newRole === 'student') {
            setEditingUser(user);
            return;
        }

        try {
            await axios.put(`http://localhost:3001/update-user-role/${userId}`, {
                role: newRole,
                group_name: null
            });


            const updatedUsers = users.map(user =>
                user.id === userId ? { ...user, role: newRole, group_name: null } : user
            );
            setUsers(updatedUsers);
        } catch (error) {
            console.error('Ошибка изменения роли:', error);
            alert('Ошибка изменения роли');
        }
    };

    const saveGroupName = async () => {
        if (!groupName) {
            alert('Пожалуйста, выберите группу');
            return;
        }

        try {
            await axios.put(`http://localhost:3001/update-user-role/${editingUser.id}`, {
                role: 'student',
                group_name: groupName
            });


            const updatedUsers = users.map(user =>
                user.id === editingUser.id ? { ...user, role: 'student', group_name: groupName } : user
            );
            setUsers(updatedUsers);

            setEditingUser(null);
            setGroupName('');
        } catch (error) {
            console.error('Ошибка изменения роли и группы:', error);
            alert('Ошибка изменения роли и группы');
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName) {
            alert('Пожалуйста, введите название группы');
            return;
        }

        try {
            const response = await axios.post('http://localhost:3001/create-group', {
                name: newGroupName
            });


            const groupsResponse = await axios.get('http://localhost:3001/groups');
            setGroups(groupsResponse.data.map(group => group.name));

            setNewGroupName('');
        } catch (error) {
            console.error('Ошибка при создании группы:', error);
            alert('Ошибка при создании группы');
        }
    };

    const handleEditGroup = (groupName) => {
        setEditingGroup(groupName);
        setEditedGroupName(groupName);
    };

    const handleSaveGroupEdit = async () => {
        if (!editedGroupName) {
            alert('Пожалуйста, введите новое название группы');
            return;
        }

        try {
            await axios.put(`http://localhost:3001/update-group/${editingGroup}`, {
                newName: editedGroupName
            });


            const groupsResponse = await axios.get('http://localhost:3001/groups');
            setGroups(groupsResponse.data.map(group => group.name));

            setEditingGroup(null);
            setEditedGroupName('');
        } catch (error) {
            console.error('Ошибка при редактировании группы:', error);
            alert('Ошибка при редактировании группы');
        }
    };

    const handleDeleteGroup = async (groupName) => {
        if (window.confirm(`Вы уверены, что хотите удалить группу "${groupName}"?`)) {
            try {
                await axios.delete(`http://localhost:3001/delete-group/${groupName}`);


                const groupsResponse = await axios.get('http://localhost:3001/groups');
                setGroups(groupsResponse.data.map(group => group.name));
            } catch (error) {
                console.error('Ошибка при удалении группы:', error);
                alert('Ошибка при удалении группы');
            }
        }
    };

    const filteredGroups = groups.filter(group =>
        group.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedGroups = filteredGroups.sort((a, b) => {
        if (sortOrder === 'asc') {
            return a.localeCompare(b);
        } else {
            return b.localeCompare(a);
        }
    });

    if (loading) {
        return <div className="loading">Загрузка...</div>;
    }

    return (
        <div className="main-container">
            <LogoutButton/>
            <div className="admin-container">
                <div className="users-block">
                    <h3 className="block-title">Список пользователей</h3>
                    <div className="filters">
                        <label>Фильтр по роли:</label>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="all">Все</option>
                            <option value="student">Студент</option>
                            <option value="teacher">Преподаватель</option>
                            <option value="admin">Администратор</option>
                        </select>
                    </div>

                    {filteredUsers.length > 0 ? (
                        <table>
                            <thead>
                            <tr>
                                <th>ФИО</th>
                                <th>Телефон</th>
                                <th>Почта</th>
                                <th>Роль</th>
                                <th>Группа (если студент)</th>
                                <th>Изменить роль</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id}>
                                    <td>{user.full_name}</td>
                                    <td>{user.phone_number}</td>
                                    <td>{user.email}</td>
                                    <td>{user.role}</td>
                                    <td>{user.group_name || '-'}</td>
                                    <td>
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                        >
                                            <option value="student">Студент</option>
                                            <option value="teacher">Преподаватель</option>
                                            <option value="admin">Администратор</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>Нет зарегистрированных пользователей.</p>
                    )}
                </div>
                <div className="groups-block">
                    <h3 className="block-title">Управление группами</h3>
                    <div className="create-group-form">
                        <input
                            type="text"
                            placeholder="Название группы"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                        />
                        <button onClick={handleCreateGroup}>Создать группу</button>
                    </div>
                    <div className="search-group">
                        <input
                            type="text"
                            placeholder="Поиск группы"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="sort-group">
                        <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                            Сортировать {sortOrder === 'asc' ? '▲' : '▼'}
                        </button>
                    </div>
                    <div className="groups-list">
                        <h4>Список групп</h4>
                        {sortedGroups.map((group, index) => (
                            <div key={index} className="group-item">
                                <span>{group}</span>
                                <div className="group-actions">
                                    <button onClick={() => handleEditGroup(group)}>✏️</button>
                                    <button onClick={() => handleDeleteGroup(group)}>🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {editingUser && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Выберите группу для {editingUser.full_name}</h3>
                            <select
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            >
                                <option value="">Выберите группу</option>
                                {groups.map((group, index) => (
                                    <option key={index} value={group}>
                                        {group}
                                    </option>
                                ))}
                            </select>
                            <div className="modal-buttons">
                                <button onClick={saveGroupName}>Сохранить</button>
                                <button onClick={() => setEditingUser(null)}>Отмена</button>
                            </div>
                        </div>
                    </div>
                )}
                {editingGroup && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Редактирование группы</h3>
                            <input
                                type="text"
                                placeholder="Новое название группы"
                                value={editedGroupName}
                                onChange={(e) => setEditedGroupName(e.target.value)}
                            />
                            <div className="modal-buttons">
                                <button onClick={handleSaveGroupEdit}>Сохранить</button>
                                <button onClick={() => setEditingGroup(null)}>Отмена</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPage;
