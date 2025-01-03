import React, {useState} from "react";
import "../styles/Login.css";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faUser, faLock, faImage, faSignature} from "@fortawesome/free-solid-svg-icons";
import {sendGetRequest, sendPostRequest} from "../utils/HTTP";
import {useNavigate} from 'react-router-dom';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);

    const navigate = useNavigate();

    const toggleForm = () => setIsLogin(!isLogin);

    const [logInInfo, setLogInInfo] = useState({
        username: "",
        password: "",
        name: "",
        avatar: null
    });

    function onLogInInfoChanged(e) {
        const {name, value} = e.target;
        setLogInInfo({...logInInfo, [name]: value});
    }

    function onAvatarChanged(e) {
        setLogInInfo({...logInInfo, avatar: e.target.files[0]});
    }

    async function logIn() {// Prevent the default form submission
        const data = await sendPostRequest(
            "http://localhost:8081/api/auth/authenticate",
            logInInfo
        );
        sessionStorage.setItem('token', data.token);
        const userInfo = await sendGetRequest("http://localhost:8081/api/user/principal")
        sessionStorage.setItem('userId', userInfo.principal.id);
        sessionStorage.setItem('userAvt', userInfo.principal.avatar);
        console.log(userInfo)
        navigate('/Chat/0')
    }

    async function signUp() {
            const formData = new FormData();
            formData.append("username", logInInfo.username);
            formData.append("password", logInInfo.password);
            formData.append("name", logInInfo.name);
            formData.append("avatar", logInInfo.avatar);
            try {
                const response = await fetch("http://localhost:8081/api/auth/register", {
                    method: "POST",
                    body: formData, // Send FormData directly
                });
                if (!response.ok) {
                    throw new Error("Failed to sign up");
                }
                alert("Đăng Nhập Thành Công");
                logIn()
            } catch (error) {
                console.error("Error during sign-up:", error);
                alert("Error during sign-up. Please try again.");
            }
        }

        return (
            <div className="auth-container">
                <div className="auth-card">
                    <h2 className="auth-title">{isLogin ? "Login" : "Sign Up"}</h2>
                    <form className="auth-form" onSubmit={(e) => {
                        e.preventDefault(); // Prevent the default form submission behavior
                        if (isLogin) {
                            logIn(); // Call the logIn function if isLogin is true
                        } else {
                            signUp(); // Call the signUp function if isLogin is false
                        }
                    }}>
                        {!isLogin && (
                            <div className="input-group">
                                <FontAwesomeIcon icon={faSignature} className="input-icon"/>
                                <input
                                    name="name"
                                    type="text"
                                    placeholder="Full Name"
                                    className="auth-input"
                                    value={logInInfo.name}
                                    onChange={onLogInInfoChanged}
                                />
                            </div>
                        )}
                        <div className="input-group">
                            <FontAwesomeIcon icon={faUser} className="input-icon"/>
                            <input
                                type="username"
                                name="username"
                                placeholder="Username"
                                value={logInInfo.username}
                                onChange={onLogInInfoChanged}
                                className="auth-input"
                            />
                        </div>
                        <div className="input-group">
                            <FontAwesomeIcon icon={faLock} className="input-icon"/>
                            <input
                                name="password"
                                type="password"
                                value={logInInfo.password}
                                placeholder="Password"
                                className="auth-input"
                                onChange={onLogInInfoChanged}
                            />
                        </div>
                        {!isLogin && (
                            <div className="input-group">
                                <FontAwesomeIcon icon={faImage} className="input-icon"/>
                                <input
                                    type="file"
                                    placeholder="Avatar"
                                    className="auth-input"
                                    onChange={onAvatarChanged}
                                />
                            </div>
                        )}
                        <button type="submit" className="auth-button">
                            {isLogin ? "Log In" : "Sign Up"}
                        </button>
                    </form>
                    <p className="auth-footer">
                        {isLogin
                            ? "Don't have an account?"
                            : "Already have an account?"}{" "}
                        <span onClick={toggleForm} className="toggle-link">
            {isLogin ? "Sign up" : "Log in"}
          </span>
                    </p>
                </div>
            </div>
        );
    };

    export default AuthPage;
