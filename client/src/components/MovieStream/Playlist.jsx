import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Playlist.css';

const Playlist = ({ socket, roomId, isHost, setVideoSource }) => {
  const [playlist, setPlaylist] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', url: '', duration: 0 });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!socket) return;

    // Listen for playlist updates
    socket.on('playlist-update', (updatedPlaylist) => {
      setPlaylist(updatedPlaylist);
    });

    return () => {
      socket.off('playlist-update');
    };
  }, [socket]);

  const addToPlaylist = async () => {
    if (!socket || !newItem.title || !newItem.url) return;

    setLoading(true);
    try {
      socket.emit('add-to-playlist', {
        title: newItem.title,
        url: newItem.url,
        duration: parseInt(newItem.duration) || 0,
        thumbnailUrl: ''
      });

      // Reset form
      setNewItem({ title: '', url: '', duration: 0 });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding to playlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromPlaylist = (index) => {
    if (!socket) return;
    
    socket.emit('remove-from-playlist', { index });
  };

  const playItem = (item, index) => {
    if (!socket || !isHost) return;

    // If user is host, they can change the video
    socket.emit('change-video-source', {
      roomId,
      source: item.url,
      movieMetadata: {
        title: item.title,
        duration: item.duration,
        thumbnailUrl: item.thumbnailUrl
      }
    });

    // Remove the played item from playlist
    socket.emit('remove-from-playlist', { index });
  };

  const playNext = () => {
    if (!socket || !isHost || playlist.length === 0) return;
    
    socket.emit('play-next-in-playlist');
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '?';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="playlist-container">
      <div className="playlist-header">
        <h3>Playlist ({playlist.length})</h3>
        <div className="playlist-actions">
          {isHost && playlist.length > 0 && (
            <button className="play-next-button" onClick={playNext}>
              Play Next
            </button>
          )}
          <button 
            className="add-to-playlist-button"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancel' : 'Add Item'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="add-playlist-form">
          <input
            type="text"
            placeholder="Title"
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
          />
          <input
            type="text"
            placeholder="Video URL/Path"
            value={newItem.url}
            onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
          />
          <input
            type="number"
            placeholder="Duration (seconds)"
            value={newItem.duration}
            onChange={(e) => setNewItem({ ...newItem, duration: e.target.value })}
          />
          <button 
            className="submit-playlist-button"
            onClick={addToPlaylist}
            disabled={loading || !newItem.title || !newItem.url}
          >
            {loading ? 'Adding...' : 'Add to Playlist'}
          </button>
        </div>
      )}

      {playlist.length === 0 ? (
        <div className="empty-playlist">
          <p>No items in playlist</p>
        </div>
      ) : (
        <ul className="playlist-items">
          {playlist.map((item, index) => (
            <li key={index} className="playlist-item">
              <div className="playlist-item-info">
                <span className="playlist-item-title">{item.title}</span>
                <div className="playlist-item-details">
                  <span className="playlist-item-duration">{formatDuration(item.duration)}</span>
                  <span className="playlist-item-added">Added at {formatDate(item.addedAt)}</span>
                </div>
              </div>
              <div className="playlist-item-actions">
                {isHost && (
                  <button
                    className="play-button"
                    onClick={() => playItem(item, index)}
                  >
                    Play
                  </button>
                )}
                {(isHost || user?._id === item.addedBy) && (
                  <button
                    className="remove-button"
                    onClick={() => removeFromPlaylist(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Playlist; 