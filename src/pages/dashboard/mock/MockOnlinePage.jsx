import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const statusConfig = {
  available: {
    label: "Available",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  busy: {
    label: "Busy",
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  pending: {
    label: "Pending Approval",
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
};

const MockOnlinePage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("available");
  const [showMessage, setShowMessage] = useState(false);

  const handleRequest = () => {
    setStatus("pending");
    setShowMessage(true);
  };

  const StatusIcon = statusConfig[status].icon;

  return (
    <div className="w-full min-h-screen p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(`/mock/select`)}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Full Mock Test - Online
          </h1>
          <p className="text-lg text-gray-600">
            Request to take your mock test online
          </p>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card
            className={`rounded-2xl shadow-sm border-2 ${statusConfig[status].borderColor} ${statusConfig[status].bgColor}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <StatusIcon className={`w-8 h-8 ${statusConfig[status].color}`} />
                <div>
                  <h3 className="text-lg font-semibold mb-1">Status</h3>
                  <p className={`text-lg font-medium ${statusConfig[status].color}`}>
                    {statusConfig[status].label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <p className="text-gray-600 leading-relaxed">
                Your request will be reviewed by the admin before approval. Once approved, you'll be able to take the mock test online from your device.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Request Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <Button
            onClick={handleRequest}
            disabled={status === "pending"}
            className={`w-full py-6 text-lg font-medium rounded-xl ${
              status === "pending"
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            } text-white`}
          >
            {status === "pending" ? "Request Pending" : "Request Online Mock"}
          </Button>
        </motion.div>

        {/* Success Message */}
        <AnimatePresence>
          {showMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="rounded-2xl shadow-md border-2 border-yellow-200 bg-yellow-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Clock className="w-6 h-6 text-yellow-600 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                        Request Submitted
                      </h3>
                      <p className="text-yellow-800">
                        You will receive a notification after admin approval. Please check back later for updates.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MockOnlinePage;

