FROM golang:1.25.6-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build \
    -o trip-service \
    ./services/trip-service/cmd

FROM alpine:3.19

WORKDIR /root/
COPY --from=builder /app/trip-service .

ENV PORT=50051
EXPOSE 50051

CMD ["./trip-service"]
