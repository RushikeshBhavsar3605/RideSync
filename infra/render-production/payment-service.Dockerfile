FROM golang:1.25.6-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build \
    -o payment-service \
    ./services/payment-service/cmd

FROM alpine:3.19

WORKDIR /root/
COPY --from=builder /app/payment-service .

ENV PORT=9004
EXPOSE 9004

CMD ["./payment-service"]
