FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY Backend/pom.xml Backend/pom.xml
RUN mvn -f Backend/pom.xml dependency:go-offline -B
COPY Backend Backend
COPY unwrapplsql Backend/src/main/resources/static/unwrapplsql
COPY jsonformatter Backend/src/main/resources/static/jsonformatter
COPY textcompare Backend/src/main/resources/static/textcompare
COPY xml-formatter Backend/src/main/resources/static/xml-formatter
COPY base64-tool Backend/src/main/resources/static/base64-tool
COPY url-encoder-decoder Backend/src/main/resources/static/url-encoder-decoder
RUN mvn -f Backend/pom.xml clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/Backend/target/unwrap-plsql-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
