FROM maven:3.9.9-eclipse-temurin-21-alpine AS build

WORKDIR /workspace/backend
COPY backend/pom.xml ./
RUN mvn --no-transfer-progress -B dependency:go-offline

COPY backend/src ./src
COPY data /workspace/data
RUN mvn --no-transfer-progress -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /workspace/backend/target/*.jar app.jar

USER app
EXPOSE 8080

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-XX:InitialRAMPercentage=20.0", "-jar", "/app/app.jar"]
