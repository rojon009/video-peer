import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import io from "socket.io-client";
import styled from "styled-components";
import "./App.css";

const Container = styled.div`
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const Row = styled.div`
  display: flex;
  width: 100%;
`;

const Video = styled.video`
  border: 1px solid blue;
  width: 50%;
  height: 50%;
`;

function App() {
  const [value, setValue] = useState(0);
  const [yourID, setYourID] = useState("");
  const [users, setUsers] = useState({});
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);

  const userVideo = useRef();
  const partnerVideo = useRef();
  const socket = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    socket.current = io.connect("/");
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }
      });

    socket.current.on("yourID", (id) => {
      setYourID(id);

      console.log("me " + id);
    });
    socket.current.on("allUsers", (users) => {
      setUsers(users);
    });

    socket.current.on("hey", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      console.log("caller " + data.from);
      setCallerSignal(data.signal);
    });

    socket.current.on("callEnded", (data) => {
      console.log(data);
      setCallAccepted(false);
      setCaller("");
      setCallerSignal(null);
      setCallAccepted(false);
      connectionRef.current.destroy();
      setValue(value + 1);
      setUsers({});
    });
  }, [value]);

  function callPeer(id) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      config: {
        iceServers: [
          {
            urls: "stun:numb.viagenie.ca",
            username: "sultan1640@gmail.com",
            credential: "98376683",
          },
          {
            urls: "turn:numb.viagenie.ca",
            username: "sultan1640@gmail.com",
            credential: "98376683",
          },
        ],
      },
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.current.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: yourID,
      });
    });

    peer.on("stream", (stream) => {
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = stream;
      }
    });

    socket.current.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
      setCaller(id);
    });

    connectionRef.current = peer;
  }

  function acceptCall() {
    setReceivingCall(true);
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });
    peer.on("signal", (data) => {
      socket.current.emit("acceptCall", { signal: data, to: caller });
    });

    peer.on("stream", (stream) => {
      partnerVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  }

  function endCall() {
    setCallAccepted(false);
    setCaller("");
    setCallerSignal(null);
    setCallAccepted(false);
    setUsers({});

    socket.current.emit("endCall", { to: caller, from: yourID });

    connectionRef.current.destroy();
    setValue(value + 1);
  }

  let UserVideo;
  if (stream) {
    UserVideo = <Video playsInline muted ref={userVideo} autoPlay />;
  }

  let incomingCall;
  if (receivingCall) {
    incomingCall = (
      <div>
        <h1>{caller} is calling you</h1>
        <button onClick={acceptCall}>Accept</button>
      </div>
    );
  }
  return (
    <React.Fragment>
      <Container>
        <Row>
          {UserVideo}
          {callAccepted && (
            <>
              <Video playsInline ref={partnerVideo} autoPlay />
              <button onClick={endCall}>End Call</button>
            </>
          )}
        </Row>
        <Row>
          {Object.keys(users).map((key) => {
            if (key === yourID) {
              return null;
            }
            return (
              <button key={key} onClick={() => callPeer(key)}>
                Call {key}
              </button>
            );
          })}
        </Row>
        <Row>{}</Row>
        <Row>
          {receivingCall && !callAccepted && (
            <button onClick={acceptCall}>Accept Call</button>
          )}
        </Row>
      </Container>
    </React.Fragment>
  );
}

export default App;
