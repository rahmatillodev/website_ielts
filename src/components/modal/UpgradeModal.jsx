import React from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/store/systemStore'

const UpgradeModal = ({ children }) => {
    const { settings } = useSettingsStore()
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">⭐</span>
          </div>
          <DialogTitle className="text-2xl font-bold">Upgrade to Premium</DialogTitle>
          <DialogDescription className="text-gray-500 pt-2">
            You are currently on the free plan. Unlock unlimited mock tests, AI-powered writing evaluation, and detailed speaking feedback.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span> Unlimited Practice Tests
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span> AI Writing & Speaking Scores
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span> Advanced Performance Analytics
            </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <DialogClose asChild>
                <Button variant="outline" className="w-full sm:flex-1">Later</Button>
            </DialogClose>
            <a href={`https://t.me/${settings.telegram_bot_url}`} target="_blank" className="w-full sm:flex-1">
            <Button className="w-full sm:flex-1 bg-[#4B8EE3] hover:bg-blue-600">Upgrade Now</Button>
            </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default UpgradeModal