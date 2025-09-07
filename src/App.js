import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentPage from './pages/StudentPage';
import TeacherPage from './pages/TeacherPage';
import AdminPage from './pages/AdminPage';
import PrivateRoute from './components/PrivateRoute';
import CreateTest from './components/CreateTest';
import TestPage from './pages/TestPage';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';

function App() {
    return (
        <Router>
            <Routes>

                <Route path="/" element={<Navigate to="/login" />} />

                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route
                    path="/student"
                    element={
                        <PrivateRoute role="student">
                            <StudentPage />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/teacher"
                    element={
                        <PrivateRoute role="teacher">
                            <TeacherPage />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/admin"
                    element={
                        <PrivateRoute role="admin">
                            <AdminPage />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/teacher/create-test"
                    element={
                        <PrivateRoute role="teacher">
                            <CreateTest />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/test/:testId"
                    element={
                        <PrivateRoute role="student">
                            <TestPage />
                        </PrivateRoute>
                    }
                />
            </Routes>
        </Router>
    );
}

export default App;
