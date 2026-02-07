import React from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Laptop, Building2, ArrowLeft } from "lucide-react";

const mockTypeNames = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
};

const MockTypeSelectionPage = () => {
  const navigate = useNavigate();
  const { type } = useParams();
  const mockTypeName = mockTypeNames[type] || type;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="w-full min-h-screen p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/mock")}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Mock Tests</span>
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {mockTypeName} Test
          </h1>
          <p className="text-lg text-gray-600">
            How would you like to take your mock test?
          </p>
        </motion.div>

        {/* Mode Selection Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Online Mock Card */}
          <motion.div variants={itemVariants}>
            <Card className="h-full rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-200">
              <CardContent className="p-8 flex flex-col items-center text-center h-full">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-6">
                  <Laptop className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-semibold mb-4">Take Online Mock</h2>
                <p className="text-gray-600 mb-6 grow">
                  Take the mock test from your laptop at home
                </p>
                <Button
                  onClick={() => navigate(`/mock/${type}/online`)}
                  className="w-full bg-blue-500 text-white hover:bg-blue-600 rounded-xl py-6 text-lg font-medium"
                >
                  Take Online
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Visit Center Card */}
          <motion.div variants={itemVariants}>
            <Card className="h-full rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border-2 hover:border-green-200">
              <CardContent className="p-8 flex flex-col items-center text-center h-full">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
                  <Building2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold mb-4">Visit Mock Center</h2>
                <p className="text-gray-600 mb-6 grow">
                  Come to our mock center and take the test in a real exam environment
                </p>
                <Button
                  onClick={() => navigate(`/mock/${type}/center`)}
                  className="w-full bg-green-500 text-white hover:bg-green-600 rounded-xl py-6 text-lg font-medium"
                >
                  Visit Center
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default MockTypeSelectionPage;

