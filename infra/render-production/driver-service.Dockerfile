FROM golang:1.25.6-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build \
    -o driver-service \
    ./services/driver-service

FROM alpine:3.19

WORKDIR /root/
COPY --from=builder /app/driver-service .

ENV PORT=50052
EXPOSE 50052

CMD ["./driver-service"]
