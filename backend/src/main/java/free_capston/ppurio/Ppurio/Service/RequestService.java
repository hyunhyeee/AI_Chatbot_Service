package free_capston.ppurio.Ppurio.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import free_capston.ppurio.Ppurio.Dto.FileDto;
import free_capston.ppurio.Ppurio.Dto.SendMessageDto;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class RequestService {
    private static final String URI = "https://message.ppurio.com";
    private static final String PPURIO_ACCOUNT = "hansung06";
    private static final String API_KEY = "2044bc5c49751a3951dc0e39cf1a512996b2a69dcce1f6fbb8d22e7f56fd7e95";
    private static final Integer TIME_OUT = 5000;
    private static final String FROM = "01051454202";
    private static final String duplicateFlag = "N";
    private static final String refkey = "refKey";



    public void requestSend(SendMessageDto sendMessageDto){
        String basicAuthorization = Base64.getEncoder().encodeToString((PPURIO_ACCOUNT + ":" + API_KEY).getBytes());
        Map<String, Object> tokenResponse = getToken(URI, basicAuthorization);
        send(URI, (String) tokenResponse.get("token"), sendMessageDto);
    }


    private Map<String, Object> send(String baseUri, String accessToken, SendMessageDto sendMessageDto) {
        HttpURLConnection conn = null;
        try {
            String bearerAuthorization = String.format("%s %s", "Bearer", accessToken);
            Request request = new Request(baseUri + "/v1/message", bearerAuthorization);

            // createSendTestParams를 호출하여 필요한 파라미터를 생성
            Map<String, Object> params = createSendTestParams(sendMessageDto);

            // DTO를 JSON으로 변환하여 HTTP 요청 생성
            conn = createConnection(request, params);

            int responseCode = conn.getResponseCode();
            System.out.println("Response Code: " + responseCode);

            if (responseCode != 200) {
                InputStream errorStream = conn.getErrorStream();
                String errorResponse = new BufferedReader(new InputStreamReader(errorStream)).lines().collect(Collectors.joining("\n"));
                System.out.println("Error Response: " + errorResponse);
            }

            return getResponseBody(conn);
        } catch (IOException e) {
            throw new RuntimeException("메시지 전송 중 오류 발생", e);
        }
    }

    private Map<String, Object> getToken(String baseUri, String BasicAuthorization) {
        HttpURLConnection conn = null;
        try {
            // 요청 파라미터 생성
            Request request = new Request(baseUri + "/v1/token", "Basic " + BasicAuthorization);

            // 요청 객체 생성
            conn = createConnection(request);

            // 응답 데이터 객체 변환
            return getResponseBody(conn);
        } catch (IOException e) {
            throw new RuntimeException("API 요청과 응답 실패", e);
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private Map<String, Object> createSendTestParams(SendMessageDto sendMessageDto) throws IOException {
        HashMap<String, Object> params = new HashMap<>();

        // 기존 필드 설정
        params.put("account", sendMessageDto.getAccount());
        params.put("messageType", sendMessageDto.getMessageType());
        params.put("from", FROM);
        params.put("content", sendMessageDto.getContent());
        params.put("duplicateFlag", duplicateFlag);
        params.put("targetCount", sendMessageDto.getTargetCount());
        params.put("targets", sendMessageDto.getTargets());
        params.put("refKey", refkey);

        // files 필드 처리
        if (sendMessageDto.getFiles() != null && !sendMessageDto.getFiles().isEmpty()) {
            // files가 null이 아니고 비어있지 않으면 처리
            List<Map<String, Object>> fileParamsList = sendMessageDto.getFiles().stream()
                    .map(fileUrl -> {
                        try {
                            return createFileTestParams(fileUrl);
                        } catch (IOException e) {
                            throw new RuntimeException("파일을 가져오는데 실패했습니다: " + fileUrl, e);
                        }
                    })
                    .toList();
            params.put("files", fileParamsList);
        }

        return params;
    }

private Map<String, Object> createFileTestParams(FileDto fileDto) throws IOException {
    String fileUrl = fileDto.getFileUrl();
    try (InputStream inputStream = new URL(fileUrl).openStream()) {
        byte[] fileBytes = inputStream.readAllBytes();
        String encodedFileData = Base64.getEncoder().encodeToString(fileBytes);

        HashMap<String, Object> params = new HashMap<>();
        params.put("size", fileBytes.length);
        params.put("name", Paths.get(new URL(fileUrl).getPath()).getFileName().toString());
        params.put("data", encodedFileData);
        return params;
    } catch (IOException e) {
        throw new RuntimeException("파일을 가져오는데 실패했습니다: " + fileUrl, e);
    }
}


    private Map<String, Object> getResponseBody(HttpURLConnection conn) throws IOException{
        InputStream inputStream = conn.getResponseCode() == 200 ? conn.getInputStream() : conn.getErrorStream();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            StringBuilder responseBody = new StringBuilder();
            String inputLine;
            while ((inputLine = br.readLine()) != null) {
                responseBody.append(inputLine);
            }
            return convertJsonToMap(responseBody.toString());
        } catch (IOException e) {
            throw new RuntimeException("API 응답을 읽는 데 실패했습니다.", e);
        }

    }



    private Map<String, Object> convertJsonToMap(String jsonString) throws JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();
        return objectMapper.readValue(jsonString, new TypeReference<>() {});
    }

    private HttpURLConnection createConnection(Request request, Map<String, Object> params) throws IOException {
        ObjectMapper objectMapper = new ObjectMapper();
        String jsonInputString = objectMapper.writeValueAsString(params); // Serialize the parameters map

        HttpURLConnection connect = createConnection(request);
        connect.setDoOutput(true);

        try (OutputStream os = connect.getOutputStream()) {
            byte[] input = jsonInputString.getBytes(StandardCharsets.UTF_8);
            os.write(input, 0, input.length);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return connect;
    }

    private HttpURLConnection createConnection(Request request) throws IOException {
        URL url = new URL(request.getRequestUri());
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Authorization", request.getAuthorization());
        conn.setConnectTimeout(TIME_OUT);
        conn.setReadTimeout(TIME_OUT);
        return conn;
    }

    @Getter
    @AllArgsConstructor
    class Request{
        private String requestUri;
        private String authorization;

    }
}
