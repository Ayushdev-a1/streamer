import VideoPlayer from "../components/VideoPlayer/VideoPlayer";

export default function Stream() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#222" }}>
      <VideoPlayer />
    </div>
  );
}
    