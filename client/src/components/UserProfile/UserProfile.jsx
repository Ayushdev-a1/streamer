import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import userService from '../../services/userService';
import './UserProfile.css';

const UserProfile = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        if (activeTab === 'favorites') {
          const favoritesData = await userService.getFavorites(user);
          setFavorites(favoritesData);
        } else if (activeTab === 'history') {
          const historyData = await userService.getWatchHistory(user);
          setHistory(historyData);
        } else if (activeTab === 'friends') {
          const friendsData = await userService.getFriends(user);
          setFriends(friendsData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [activeTab, user]);

  const handleRemoveFavorite = async (favoriteId) => {
    if (!user) return;
    
    try {
      await userService.removeFromFavorites(favoriteId, user);
      setFavorites(favorites.filter(fav => fav._id !== favoriteId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const handlePlayMovie = (moviePath, title) => {
    navigate(`/room?roomId=private-${user._id}`, { 
      state: { 
        isHost: true, 
        selectedVideo: moviePath,
        movieTitle: title
      } 
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown duration';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="user-profile-container">
      <div className="user-profile-header">
        <div className="user-info">
          {user?.profilePic && (
            <img src={user.profilePic} alt="Profile" className="profile-image" />
          )}
          <h2>{user?.name || 'User'}</h2>
          <p>{user?.email}</p>
        </div>
        
        <div className="profile-tabs">
          <button 
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button 
            className={`tab-button ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            Favorites
          </button>
          <button 
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Watch History
          </button>
          <button 
            className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            Friends
          </button>
        </div>
      </div>

      <div className="profile-content">
        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : (
          <>
            {activeTab === 'profile' && (
              <div className="profile-info">
                <h3>Your Profile</h3>
                <div className="profile-details">
                  <p><strong>Name:</strong> {user?.name}</p>
                  <p><strong>Email:</strong> {user?.email}</p>
                  <p><strong>Joined:</strong> {user?.createdAt ? formatDate(user.createdAt) : 'N/A'}</p>
                </div>
              </div>
            )}

            {activeTab === 'favorites' && (
              <div className="favorites-list">
                <h3>Your Favorite Movies</h3>
                {favorites.length === 0 ? (
                  <p className="empty-state">You haven't added any favorites yet.</p>
                ) : (
                  <div className="movie-grid">
                    {favorites.map((favorite) => (
                      <div key={favorite._id} className="movie-card">
                        <div className="movie-thumbnail">
                          {favorite.thumbnailUrl ? (
                            <img src={favorite.thumbnailUrl} alt={favorite.title} />
                          ) : (
                            <div className="placeholder-thumbnail">
                              <span>{favorite.title.charAt(0)}</span>
                            </div>
                          )}
                          <div className="movie-actions">
                            <button 
                              className="play-button"
                              onClick={() => handlePlayMovie(favorite.path, favorite.title)}
                            >
                              Play
                            </button>
                            <button 
                              className="remove-button"
                              onClick={() => handleRemoveFavorite(favorite._id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <h4 className="movie-title">{favorite.title}</h4>
                        <p className="added-date">Added: {formatDate(favorite.addedAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="history-list">
                <h3>Your Watch History</h3>
                {history.length === 0 ? (
                  <p className="empty-state">Your watch history is empty.</p>
                ) : (
                  <div className="history-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Movie</th>
                          <th>Watched</th>
                          <th>Duration</th>
                          <th>Progress</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((item) => (
                          <tr key={item._id}>
                            <td>{item.movieTitle}</td>
                            <td>{formatDate(item.watchedAt)}</td>
                            <td>{formatDuration(item.duration)}</td>
                            <td>
                              {item.duration && item.watchedDuration ? (
                                <div className="progress-bar">
                                  <div 
                                    className="progress"
                                    style={{width: `${Math.min(100, (item.watchedDuration / item.duration) * 100)}%`}}
                                  ></div>
                                </div>
                              ) : 'N/A'}
                            </td>
                            <td>
                              <button 
                                className="action-button"
                                onClick={() => handlePlayMovie(item.moviePath, item.movieTitle)}
                              >
                                Watch Again
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'friends' && (
              <div className="friends-list">
                <h3>Your Friends</h3>
                {friends.length === 0 ? (
                  <p className="empty-state">You haven't added any friends yet.</p>
                ) : (
                  <div className="friends-grid">
                    {friends.map((friend) => (
                      <div key={friend._id} className="friend-card">
                        {friend.profilePic ? (
                          <img src={friend.profilePic} alt={friend.name} className="friend-avatar" />
                        ) : (
                          <div className="friend-avatar-placeholder">
                            {friend.name.charAt(0)}
                          </div>
                        )}
                        <h4>{friend.name}</h4>
                        <button 
                          className="invite-button"
                          onClick={() => navigate('/create-room', { state: { inviteFriend: friend._id } })}
                        >
                          Invite to Watch
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserProfile; 