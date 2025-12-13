"use client"

import { Check, X, Truck, Package, Edit } from "lucide-react"
import { approveTransfer, rejectTransfer, shipTransfer, receiveTransfer } from "./actions"
import toast from "react-hot-toast"
import { useState } from "react"
import { TransferUpdateDialog } from "@/components/transfers/transfer-update-dialog"

interface TransferActionsProps {
  transferId: string
  status: string
  onUpdate?: () => void
}

export function TransferActions({ transferId, status, onUpdate }: TransferActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleApprove = async () => {
    if (isLoading) return
    setIsLoading(true)
    const loadingToast = toast.loading("Approving transfer...")
    try {
      await approveTransfer(transferId)
      toast.success("Transfer approved successfully", { id: loadingToast })
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.message || "Failed to approve transfer", { id: loadingToast })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    if (isLoading) return
    if (!confirm("Are you sure you want to reject this transfer? This action cannot be undone.")) {
      return
    }
    setIsLoading(true)
    const loadingToast = toast.loading("Rejecting transfer...")
    try {
      await rejectTransfer(transferId)
      toast.success("Transfer rejected", { id: loadingToast })
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.message || "Failed to reject transfer", { id: loadingToast })
    } finally {
      setIsLoading(false)
    }
  }

  const handleShip = async () => {
    if (isLoading) return
    setIsLoading(true)
    const loadingToast = toast.loading("Shipping transfer...")
    try {
      await shipTransfer(transferId)
      toast.success("Transfer shipped successfully", { id: loadingToast })
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.message || "Failed to ship transfer", { id: loadingToast })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReceive = async () => {
    if (isLoading) return
    if (!confirm("Confirm receipt of this transfer? Inventory will be updated.")) {
      return
    }
    setIsLoading(true)
    const loadingToast = toast.loading("Receiving transfer...")
    try {
      await receiveTransfer(transferId)
      toast.success("Transfer received and inventory updated", { id: loadingToast })
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.message || "Failed to receive transfer", { id: loadingToast })
    } finally {
      setIsLoading(false)
    }
  }

  // Show different actions based on status
  if (status === "PENDING") {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setShowEditDialog(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
        >
          <Edit className="h-4 w-4" />
          Edit
        </button>
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Check className="h-4 w-4" />
          Approve
        </button>
        <button
          onClick={handleReject}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <X className="h-4 w-4" />
          Reject
        </button>
      </div>
    )
  }

  if (status === "APPROVED") {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setShowEditDialog(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
        >
          <Edit className="h-4 w-4" />
          Edit
        </button>
        <button
          onClick={handleShip}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Truck className="h-4 w-4" />
          Ship
        </button>
      </div>
    )
  }

  if (status === "IN_TRANSIT") {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleReceive}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Package className="h-4 w-4" />
          Receive
        </button>
      </div>
    )
  }

  // No actions for COMPLETED or CANCELLED
  return (
    <>
      <TransferUpdateDialog
        transferId={transferId}
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSuccess={() => {
          setShowEditDialog(false)
          onUpdate?.()
        }}
      />
    </>
  )
}
