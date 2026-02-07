import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

const CenterMapCard = ({ mapUrl }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="rounded-2xl shadow-sm p-0">
        <CardContent className="p-0 m-0 px-0 py-0">
          <div className="overflow-hidden rounded-xl border-2 border-gray-300">
            <iframe
              src={mapUrl}
              width="100%"
              height="260"
              style={{ border: 0, minHeight: "20rem", width: "100%" }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Mock Center Location Map"
            ></iframe>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CenterMapCard;

