import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Form, Button } from "react-bootstrap";
import { DeviceFrameset } from "react-device-frameset";
import "react-device-frameset/styles/marvel-devices.min.css";
import { FaImage, FaCommentDots, FaPhoneAlt } from "react-icons/fa";
import "../../styles/Message.css";
import API_BASE_URL from "../../URL_API";

const Message = () => {
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [targets, setTargets] = useState([{ name: "", to: "" }]);
  const [userText, setUserText] = useState(null);
  const [category, setCategory] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [text, setText] = useState(null);
  const [userId, setUserId] = useState(null);
  const [fileUpload, setFileUpload] = useState(null);

  useEffect(() => {
    setText(message);
  }, [message]);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  useEffect(() => {
    if (location.state) {
      if (location.state.imageSrc) {
        setImageSrc(location.state.imageSrc);
      }
      setText(location.state.text);
      setUserText(location.state.userText);
      setCategory(location.state.category);

      // 편집된 이미지도 전달받았다면 설정
      if (location.state.editImage) {
        setImageSrc(location.state.editImage);
      }

      // 전달받은 값들을 콘솔로 출력
      console.log("Received Image Source:", location.state.imageSrc);
      console.log("Received Edited Image:", location.state.editImage);
      console.log("Received Text:", location.state.text);
      console.log("userText: ", location.state.userText, ", userCategory: ", location.state.category);
    }
  }, [location.state]);


  // 받는 사람 추가
  const addTarget = () => {
    setTargets([...targets, { name: "", to: "" }]);
  };

  // 받는 사람 삭제
  const removeTarget = (index) => {
    setTargets(targets.filter((_, i) => i !== index));
  };

  // 이름과 번호 업데이트
  const updateTarget = (index, key, value) => {
    const updatedTargets = [...targets];
    updatedTargets[index][key] = value;
    setTargets(updatedTargets);
  };

  const calculateByteLength = (message) => {
    return [...message].reduce(
      (acc, char) => (char.charCodeAt(0) > 127 ? acc + 2 : acc + 1),
      0
    );
  };

  const handleSendMessage = async () => {
    const messageToSend = message.trim() ? message : text; // message가 비어 있으면 text 사용
    if (!messageToSend) {
      alert("메시지를 입력해주세요.");
      return;
    }

    const byteLength = calculateByteLength(messageToSend);
    let messageType = "SMS";
    if (imageSrc || fileUpload) {
      messageType = "MMS";
    } else if (byteLength > 90) {
      messageType = "LMS";
    }

    const targetCount = targets.length;

    const updatedTargets = targets.map((target) => ({
      to: target.to,
      name: target.name,
    }));

    const data = {
      account: "hansung06",
      messageType,
      content: messageToSend,
      targetCount,
      prompt: userText,
      category,
      targets: updatedTargets,
      userId,
    };

    // 이미지 파일이 있을 경우 파일 데이터 추가
    if (imageSrc || fileUpload) {
      data.files = [
        {
          fileUrl: imageSrc || fileUpload,
        },
      ];
    }

    console.log("Request Data:", data);

    try {
      const response = await fetch(`${API_BASE_URL}/message/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log("Response Data:", result);

      if (response.ok && result.success) {

        alert("메시지 전송에 성공했습니다!");
      } else {

        alert(result.message || "메시지 전송에 실패했습니다.");
      }
    } catch (error) {
      alert("메시지 전송 중 오류가 발생했습니다.");
      console.error("Error:", error);
    }
  };

  return (
    <div className="message-container">
      <div className="row-content">
        <div className="col-left bg-light p-4">
          <h2>메시지 작성</h2>
          <Form>
            <Form.Group className="mb-3">
              <Form.Control
                as="textarea"
                rows={6}
                placeholder="메시지를 입력하세요"
                value={message || text}
                onChange={(e) => setMessage(e.target.value)}
                className="message-input"
              />
            </Form.Group>
            <div className="drop-zone">
              <label className="file-label">
                <FaImage size={30} color="#007acc" />
                <p>이미지를 드래그하거나 클릭하여 선택하세요.</p>
                <input
                  type="file"
                  accept="image/jpeg, image/jpg"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      // 파일 크기 제한 (300KB 이하)
                      if (file.size > 300 * 1024) {
                        alert("파일 크기는 최대 300KB까지 가능합니다.");
                        return;
                      }

                      // 파일 형식 확인
                      const allowedTypes = ["image/jpeg", "image/jpg"];
                      if (!allowedTypes.includes(file.type)) {
                        alert("허용된 파일 형식은 jpg 또는 jpeg입니다.");
                        return;
                      }

                      const reader = new FileReader();

                      reader.onload = () => {
                        const base64String = reader.result.split(",")[1]; // Base64 인코딩 부분만 추출

                      };

                      reader.readAsDataURL(file); // Base64로 변환
                    }

                  }}
                />
                <span className="file-button">파일 선택</span>
              </label>

            </div>
            <Button
              variant="primary"
              onClick={handleSendMessage}
              className="w-100 mt-3"
            >
              메시지 전송
            </Button>
          </Form>
        </div>

        <div className="col-center bg-light p-4">
          <h2>받는 사람 정보</h2>
          {targets.map((target, index) => (
            <div key={index} className="target-box mb-3">
              <Form.Control
                type="text"
                placeholder="받는 사람 이름"
                value={target.name}
                onChange={(e) => updateTarget(index, "name", e.target.value)}
                className="mb-2"
              />
              <Form.Control
                type="text"
                placeholder="전화번호"
                value={target.to}
                onChange={(e) => updateTarget(index, "to", e.target.value)}
              />
            </div>
          ))}
          <div className="button-group mt-2">
            <Button variant="success" onClick={addTarget} className="me-2">
              +
            </Button>
            {targets.length > 1 && (
              <Button variant="danger" onClick={() => removeTarget(targets.length - 1)}>
                -
              </Button>
            )}
          </div>
        </div>

        <div className="col-right">
          <DeviceFrameset device="iPhone X" color="black">
            <div className="phone-content">
              <div className="phone-header">
                <div className="header-status">
                  <FaPhoneAlt size={20} style={{ marginRight: 10 }} />
                  {targets.map((target) => target.to).join(", ")}
                  <span className="message-type">
                    {imageSrc
                      ? "MMS"
                      : calculateByteLength(message) > 90
                        ? "LMS"
                        : "SMS"}
                  </span>
                </div>
              </div>
              <div className="phone-image-preview">
                {imageSrc || fileUpload ? (
                  <img
                    src={imageSrc || fileUpload} // Base64 또는 로컬 URL을 사용
                    alt="첨부 이미지"
                    style={{ maxWidth: "100%", borderRadius: "10px" }}
                  />
                ) : (
                  <div className="default-preview">
                    <FaImage size={50} color="#ccc" />
                    <p>이미지를 업로드하세요.</p>
                  </div>
                )}
              </div>

              <div className="phone-message-preview">
                {text ? (
                  <p>{text}</p>
                ) : (
                  <div className="default-message">
                    <FaCommentDots size={50} color="#ccc" />
                    <p>메시지를 입력하세요.</p>
                  </div>
                )}
              </div>

            </div>
          </DeviceFrameset>
        </div>
      </div>
    </div>
  );
};

export default Message;



