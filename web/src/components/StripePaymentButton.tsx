import { useState } from "react"
import { PaymentEventSessionCreatedData } from "../contracts"
import { Button } from "./ui/button"
import { loadStripe } from "@stripe/stripe-js"

interface StripePaymentButtonProps {
  paymentSession: PaymentEventSessionCreatedData
  isLoading?: boolean
}

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export const StripePaymentButton = ({
  paymentSession,
  isLoading = false,
}: StripePaymentButtonProps) => {
  const [isRedirecting, setIsRedirecting] = useState(false)
  const handlePayment = async () => {
    setIsRedirecting(true)
    const stripe = await stripePromise

    if (!stripe) {
      console.error("Stripe failed to load")
      setIsRedirecting(false)
      return
    }

    // Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({ sessionId: paymentSession.sessionID })

    if (error) {
      console.error("Payment error:", error)
      setIsRedirecting(false)
    }
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <Button
        disabled
        variant="destructive"
        className="w-full rounded-2xl py-6 opacity-80"
      >
        Stripe Configuration Missing
      </Button>
    )
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={isLoading || isRedirecting}
      className="w-full rounded-2xl py-7 text-lg font-bold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
    >
      {isLoading || isRedirecting ? (
        <div className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Pay {paymentSession.amount} {paymentSession.currency}
        </div>
      )}
    </Button>
  )
} 
 