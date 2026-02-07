import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const mockPrices = {
  ai: 500000,      // AI-checked mock test price
  human: 750000,    // Human-checked mock test price (more expensive)
};

const MockTypeSelector = ({ mockType, setMockType }) => {
  const totalPrice = mockPrices[mockType];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="rounded-2xl shadow-sm border-2 border-blue-200">
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold mb-4">Select Mock Type</h3>
          <div className="space-y-3">
            <button
              onClick={() => setMockType("ai")}
              className={cn(
                "w-full p-4 rounded-lg border-2 transition-all text-left",
                mockType === "ai"
                  ? "bg-blue-50 border-blue-500 shadow-md"
                  : "bg-gray-50 border-gray-300 hover:border-gray-400"
              )}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">AI-Checked</p>
                  <p className="text-sm text-gray-600">Automated evaluation</p>
                </div>
                <span className="font-semibold text-gray-900">
                  {mockPrices.ai.toLocaleString()} UZS
                </span>
              </div>
            </button>
            <button
              onClick={() => setMockType("human")}
              className={cn(
                "w-full p-4 rounded-lg border-2 transition-all text-left",
                mockType === "human"
                  ? "bg-blue-50 border-blue-500 shadow-md"
                  : "bg-gray-50 border-gray-300 hover:border-gray-400"
              )}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">Human-Checked</p>
                  <p className="text-sm text-gray-600">Expert evaluation</p>
                </div>
                <span className="font-semibold text-gray-900">
                  {mockPrices.human.toLocaleString()} UZS
                </span>
              </div>
            </button>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg">Total</span>
              <span className="font-bold text-xl text-blue-600">
                {totalPrice.toLocaleString()} UZS
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MockTypeSelector;

