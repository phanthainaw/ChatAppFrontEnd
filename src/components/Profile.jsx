import React, { useState } from "react";
import "../styles/Profile.css";
import avatarImage from "../assets/avatar.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faSave } from "@fortawesome/free-solid-svg-icons";

const UserProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "Phan Thái Nam",
    email: "phanthainam1092002@gmail.com",
    phone: "0364694271",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const toggleEdit = () => setIsEditing(!isEditing);

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <img src={avatarImage} alt="User Avatar" className="profile-avatar" />
          <button onClick={toggleEdit} className="edit-button">
            <FontAwesomeIcon icon={isEditing ? faSave : faPen} />
          </button>
        </div>
        <div className="profile-info">
          <div className="profile-field">
            <label>Full Name</label>
            {isEditing ? (
              <input
                type="text"
                name="fullName"
                value={profile.fullName}
                onChange={handleInputChange}
                className="profile-input"
              />
            ) : (
              <p>{profile.fullName}</p>
            )}
          </div>
          <div className="profile-field">
            <label>Email</label>
            {isEditing ? (
              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={handleInputChange}
                className="profile-input"
              />
            ) : (
              <p>{profile.email}</p>
            )}
          </div>
          <div className="profile-field">
            <label>Phone</label>
            {isEditing ? (
              <input
                type="text"
                name="phone"
                value={profile.phone}
                onChange={handleInputChange}
                className="profile-input"
              />
            ) : (
              <p>{profile.phone}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
