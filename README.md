# UnwrapPLSQL

UnwrapPLSQL has five clear parts:

- `Backend/` - Spring Boot API for unwrapping Oracle wrapped PL/SQL.
- `unwrapplsql/` - Static Oracle PL/SQL unwrapper frontend served by Spring Boot in production.
- `jsonformatter/` - Static JSON formatter tool.
- `textcompare/` - Static online text compare and diff checker tool.
- `xml-formatter/` - Static online XML formatter and SOAP beautifier tool.

## Run Locally

1. Open `Backend/` in IntelliJ IDEA.
2. Run `com.unwrap.UnwrapApplication` or Maven goal `spring-boot:run`.
3. Open `http://localhost:8080/` for the DevToolStack dashboard.
4. Open `http://localhost:8080/unwrapplsql/`, `http://localhost:8080/jsonformatter/`, `http://localhost:8080/textcompare/`, or `http://localhost:8080/xml-formatter/` for a specific tool.
5. For a standalone static preview of the XML tool, you can also open `xml-formatter/index.html` directly in a browser.

## Render Deployment

This repository is Render-ready using Docker.

1. Push this repository to GitHub.
2. In Render, create a new **Blueprint** from the GitHub repository, or create a new **Web Service** using the included `Dockerfile`.
3. Render will build the Spring Boot app and copy `unwrapplsql/`, `jsonformatter/`, `textcompare/`, and `xml-formatter/` into `Backend/src/main/resources/static` during the Docker build.
4. The frontend and API will run on the same Render URL.

Important files:

- `Dockerfile` - production Docker build.
- `render.yaml` - Render Blueprint configuration.
- `Backend/src/main/resources/application.properties` - uses Render's `PORT` environment variable.

## Production URLs

The canonical production URLs are:

- https://www.devtoolstack.in/
- https://www.devtoolstack.in/unwrapplsql/
- https://www.devtoolstack.in/jsonformatter/
- https://www.devtoolstack.in/textcompare/
- https://www.devtoolstack.in/xml-formatter/

This keeps all developer tools under one shared DevToolStack domain.
