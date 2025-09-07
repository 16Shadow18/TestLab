import React from "react";
import { Navigate } from "react-router-dom";
import  { jwtDecode} from "jwt-decode";

const PrivateRoute = ({ role, children }) => {
    const token = localStorage.getItem("token");
    if (!token) {
        return <Navigate to="/login" />;
    }
    try {
        const decoded = jwtDecode(token);
        if (!decoded || decoded.role !== role) {
            return <Navigate to="/login" />;
        }
        return React.cloneElement(children, { userId: decoded.id });
    } catch (error) {
        console.error("Ошибка декодирования токена:", error);
        return <Navigate to="/login" />;
    }
};

export default PrivateRoute;
