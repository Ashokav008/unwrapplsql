# UnwrapPLSQL

UnwrapPLSQL has two clear parts:

- `Backend/` - Spring Boot API for unwrapping Oracle wrapped PL/SQL.
- `unwrapplsql/` - Static frontend served by Spring Boot in production.

## Run Locally

1. Open `Backend/` in IntelliJ IDEA.
2. Run `com.unwrap.UnwrapApplication` or Maven goal `spring-boot:run`.
3. Open `http://localhost:8080/unwrapplsql` in a browser.
4. Paste wrapped PL/SQL and click **Unwrap code**.

## Render Deployment

This repository is Render-ready using Docker.

1. Push this repository to GitHub.
2. In Render, create a new **Blueprint** from the GitHub repository, or create a new **Web Service** using the included `Dockerfile`.
3. Render will build the Spring Boot app and copy `unwrapplsql/` into `Backend/src/main/resources/static` during the Docker build.
4. The frontend and API will run on the same Render URL.

Important files:

- `Dockerfile` - production Docker build.
- `render.yaml` - Render Blueprint configuration.
- `Backend/src/main/resources/application.properties` - uses Render's `PORT` environment variable.

## Production URL

The canonical production URL is:

- https://www.devtoolstack.in/unwrapplsql/

This keeps the root domain available for other projects and developer tools.
