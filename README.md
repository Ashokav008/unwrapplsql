# UnwrapPLSQL

UnwrapPLSQL has four clear parts:

- `Backend/` - Spring Boot API for unwrapping Oracle wrapped PL/SQL.
- `unwrapplsql/` - Static Oracle PL/SQL unwrapper frontend served by Spring Boot in production.
- `jsonformatter/` - Static JSON formatter tool.
- `textcompare/` - Static online text compare and diff checker tool.

## Run Locally

1. Open `Backend/` in IntelliJ IDEA.
2. Run `com.unwrap.UnwrapApplication` or Maven goal `spring-boot:run`.
3. Open `http://localhost:8080/` for the DevToolStack dashboard.
4. Open `http://localhost:8080/unwrapplsql/`, `http://localhost:8080/jsonformatter/`, or `http://localhost:8080/textcompare/` for a specific tool.

## Render Deployment

This repository is Render-ready using Docker.

1. Push this repository to GitHub.
2. In Render, create a new **Blueprint** from the GitHub repository, or create a new **Web Service** using the included `Dockerfile`.
3. Render will build the Spring Boot app and copy `unwrapplsql/`, `jsonformatter/`, and `textcompare/` into `Backend/src/main/resources/static` during the Docker build.
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

This keeps all developer tools under one shared DevToolStack domain.