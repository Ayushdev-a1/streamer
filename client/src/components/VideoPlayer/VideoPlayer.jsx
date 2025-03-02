import styled from "styled-components";

const PlayerWrapper = styled.div`
  width: 70%;
  background: black;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0px 4px 10px rgba(255, 255, 255, 0.2);
`;

export default function VideoPlayer() {
  return (
    <PlayerWrapper>
      <video src="https://example.com/sample.mp4" controls style={{ width: "100%", borderRadius: "10px" }} />
    </PlayerWrapper>
  );
}
