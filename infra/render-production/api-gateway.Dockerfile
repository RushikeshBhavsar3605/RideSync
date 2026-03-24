# ---------- Build ----------
FROM golang:1.25.6-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY services/api-gateway ../../services/api-gateway

RUN CGO_ENABLED=0 GOOS=linux go build \
    -o api-gateway \
    ./services/api-gateway/cmd

# ---------- Runtime ----------
FROM alpine:3.19

WORKDIR /root/
COPY --from=builder /app/api-gateway .

ENV PORT=8081
EXPOSE 8081

CMD ["./api-gateway"]