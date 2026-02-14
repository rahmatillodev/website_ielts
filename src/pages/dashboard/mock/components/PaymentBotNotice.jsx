import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Bot, DollarSign, Clock } from "lucide-react";

const PaymentBotNotice = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card className="rounded-2xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="shrink-0 mt-1">
              <Bot className="w-6 h-6 text-orange-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                Payment via Bot
                <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
                  IMPORTANT
                </span>
              </h3>

              <p className="text-gray-700 text-sm leading-relaxed">
                After clicking <strong>“Book Slot”</strong>, you will be automatically redirected to our
                <strong> payment bot</strong> to complete your payment.
              </p>

              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-orange-600" />
                  <span>Booking confirmation happens in the bot</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-orange-600" />
                  <span>Payment is accepted only via bot</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span>You have limited time to complete the payment</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 italic mt-2">
                * If payment is not completed in time, your booking will be automatically cancelled.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PaymentBotNotice;
