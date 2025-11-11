'use client'
import { motion } from 'framer-motion'
import React from 'react'

export function BuilderScore() {
  const score = 87 // mock score; replace with fetched data later

  return (
    <motion.div
      className="p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-lg text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-xl font-semibold mb-2">Your Builder Score</h2>
      <div className="text-6xl font-bold text-accent">{score}</div>
      <p className="text-sm opacity-70 mt-2">Higher score = better onchain reputation</p>
    </motion.div>
  )
}
