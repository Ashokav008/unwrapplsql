# UnwrapPLSQL

UnwrapPLSQL has thirteen clear parts:

- `Backend/` - Spring Boot API for unwrapping Oracle wrapped PL/SQL.
- `unwrapplsql/` - Static Oracle PL/SQL unwrapper frontend served by Spring Boot in production.
- `jsonformatter/` - Static JSON formatter tool.
- `sql-formatter/` - Static online SQL and PL/SQL formatter tool.
- `textcompare/` - Static online text compare and diff checker tool.
- `regex-tester/` - Static online regular expression tester with live match highlighting.
- `timestamp-converter/` - Static online Unix, ISO, and local date timestamp converter.
- `hash-generator/` - Static online MD5, SHA-1, and SHA-256 hash generator.
- `xml-formatter/` - Static online XML formatter and SOAP beautifier tool.
- `base64-tool/` - Static online Base64 encoder and decoder tool.
- `url-encoder-decoder/` - Static online URL encoder and decoder tool.
- `jwt-decoder/` - Static online JWT decoder tool.
- `yaml-formatter/` - Static online YAML formatter and validator tool.

## Run Locally

1. Open `Backend/` in IntelliJ IDEA.
2. Run `com.unwrap.UnwrapApplication` or Maven goal `spring-boot:run`.
3. Open `http://localhost:8080/` for the DevToolStack dashboard.
4. Open `http://localhost:8080/unwrapplsql/`, `http://localhost:8080/jsonformatter/`, `http://localhost:8080/sql-formatter/`, `http://localhost:8080/textcompare/`, `http://localhost:8080/regex-tester/`, `http://localhost:8080/timestamp-converter/`, `http://localhost:8080/hash-generator/`, `http://localhost:8080/xml-formatter/`, `http://localhost:8080/base64-tool/`, `http://localhost:8080/url-encoder-decoder/`, `http://localhost:8080/jwt-decoder/`, or `http://localhost:8080/yaml-formatter/` for a specific tool.
5. For a standalone static preview of the browser-only tools, you can also open `sql-formatter/index.html`, `regex-tester/index.html`, `timestamp-converter/index.html`, `hash-generator/index.html`, `xml-formatter/index.html`, `base64-tool/index.html`, `url-encoder-decoder/index.html`, `jwt-decoder/index.html`, or `yaml-formatter/index.html` directly in a browser.

## Render Deployment

This repository is Render-ready using Docker.

1. Push this repository to GitHub.
2. In Render, create a new **Blueprint** from the GitHub repository, or create a new **Web Service** using the included `Dockerfile`.
3. Render will build the Spring Boot app and copy `unwrapplsql/`, `jsonformatter/`, `sql-formatter/`, `textcompare/`, `regex-tester/`, `timestamp-converter/`, `hash-generator/`, `xml-formatter/`, `base64-tool/`, `url-encoder-decoder/`, `jwt-decoder/`, and `yaml-formatter/` into `Backend/src/main/resources/static` during the Docker build.
4. The frontend and API will run on the same Render URL.
5. After deployment, resubmit `https://www.devtoolstack.in/sitemap.xml` in Google Search Console so the new tool URLs are crawled quickly.

Important files:

- `Dockerfile` - production Docker build.
- `render.yaml` - Render Blueprint configuration.
- `Backend/src/main/resources/application.properties` - uses Render's `PORT` environment variable.

## Production URLs

The canonical production URLs are:

- https://www.devtoolstack.in/
- https://www.devtoolstack.in/unwrapplsql/
- https://www.devtoolstack.in/jsonformatter/
- https://www.devtoolstack.in/sql-formatter/
- https://www.devtoolstack.in/textcompare/
- https://www.devtoolstack.in/regex-tester/
- https://www.devtoolstack.in/timestamp-converter/
- https://www.devtoolstack.in/hash-generator/
- https://www.devtoolstack.in/xml-formatter/
- https://www.devtoolstack.in/base64-tool/
- https://www.devtoolstack.in/url-encoder-decoder/
- https://www.devtoolstack.in/jwt-decoder/
- https://www.devtoolstack.in/yaml-formatter/

This keeps all developer tools under one shared DevToolStack domain.
