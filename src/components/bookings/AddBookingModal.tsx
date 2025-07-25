import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { format, parseISO, addDays } from "date-fns";
import "./AddBookingModal.css";

interface Client {
  id: string;
  name: string;
}

interface Vehicle {
  id: string;
  name: string;
  price: number;
}

interface Agent {
  id: string;
  name: string;
}

interface AddBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BookingFormData) => Promise<void>;
  booking?: Booking;
  clients: Client[];
  vehicles: Vehicle[];
  agents: Agent[];
  isSubmitting?: boolean;
}

export interface BookingFormData {
  clientId: string;
  clientName: string; // Display name
  vehicleId: string;
  vehicle: string; // Display name
  startDate: string;
  endDate: string;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  paymentStatus: "paid" | "pending";
  amount: number;
  agentId: string;
  agentName: string; // Display name
  commission: number;
  commissionRate: number;
  pickupLocation: string; // Location to get the car
  returnLocation: string; // Location to return the car
}

interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  vehicleId: string;
  vehicle: string;
  startDate: string;
  endDate: string;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  paymentStatus: "paid" | "pending";
  amount: number;
  agentId: string;
  agentName: string;
  commission?: number;
  commissionRate?: number;
  pickupLocation?: string;
  returnLocation?: string;
}

export const AddBookingModal = ({
  isOpen,
  onClose,
  onSubmit,
  booking,
  clients = [],
  vehicles = [],
  agents = [],
  isSubmitting = false,
}: AddBookingModalProps) => {
  const { t } = useTranslation();

  // Format date safely for use in datetime-local input fields
  const formatDateTimeForInput = (dateString: string) => {
    try {
      // Try to parse the date string and format it for the datetime-local input (yyyy-MM-ddTHH:mm)
      // If the date doesn't include time, add default time (noon)
      const date = parseISO(dateString);
      return format(date, "yyyy-MM-dd'T'HH:mm");
    } catch {
      // If parsing fails, return current date and time
      return format(new Date(), "yyyy-MM-dd'T'HH:mm");
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
    trigger,
  } = useForm<BookingFormData>({
    defaultValues: booking
      ? {
          clientId: booking.clientId,
          clientName: booking.clientName,
          vehicleId: booking.vehicleId,
          vehicle: booking.vehicle,
          startDate: formatDateTimeForInput(booking.startDate),
          endDate: formatDateTimeForInput(booking.endDate),
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          amount: booking.amount,
          agentId: booking.agentId,
          agentName: booking.agentName,
          commission: booking.commission || 0,
          commissionRate: booking.commissionRate || 0.08,
          pickupLocation: booking.pickupLocation || "",
          returnLocation: booking.returnLocation || "",
        }
      : {
          clientId: "",
          clientName: "",
          vehicleId: "",
          vehicle: "",
          startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          endDate: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
          status: "pending",
          paymentStatus: "pending",
          agentId: "",
          agentName: "",
          commission: 0,
          commissionRate: 0.08,
          amount: 0,
          pickupLocation: "",
          returnLocation: "",
        },
  });

  const amount = watch("amount");
  const commissionRate = watch("commissionRate");
  const selectedVehicleId = watch("vehicleId");

  // Auto-update commission amount when amount or rate changes
  useEffect(() => {
    if (amount && commissionRate) {
      setValue("commission", Number((amount * commissionRate).toFixed(2)));
    }
  }, [amount, commissionRate, setValue]);

  // Auto-update vehicle price when vehicle is selected
  useEffect(() => {
    if (selectedVehicleId) {
      const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
      if (selectedVehicle && selectedVehicle.price) {
        setValue("amount", selectedVehicle.price);
        // Also update the vehicle display name
        setValue("vehicle", selectedVehicle.name);
      }
    }
  }, [selectedVehicleId, vehicles, setValue]);

  // Update form when booking changes
  useEffect(() => {
    if (booking) {
      // Make sure dates are properly formatted before setting them
      setValue("startDate", formatDateTimeForInput(booking.startDate));
      setValue("endDate", formatDateTimeForInput(booking.endDate));

      // Set other fields
      Object.entries(booking).forEach(([key, value]) => {
        if (
          key !== "id" &&
          key !== "startDate" &&
          key !== "endDate" &&
          key in booking
        ) {
          setValue(key as keyof BookingFormData, value);
        }
      });
    } else {
      reset({
        clientId: "",
        clientName: "",
        vehicleId: "",
        vehicle: "",
        startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        endDate: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
        status: "pending",
        paymentStatus: "pending",
        agentId: "",
        agentName: "",
        commission: 0,
        commissionRate: 0.08,
        amount: 0,
        pickupLocation: "",
        returnLocation: "",
      });
    }
  }, [booking, setValue, reset]);

  // Handle client selection
  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    setValue("clientId", clientId);

    const selectedClient = clients.find((c) => c.id === clientId);
    if (selectedClient) {
      setValue("clientName", selectedClient.name);
    }
  };

  // Handle agent selection
  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const agentId = e.target.value;
    setValue("agentId", agentId);

    const selectedAgent = agents.find((a) => a.id === agentId);
    if (selectedAgent) {
      setValue("agentName", selectedAgent.name);
    }
  };

  // Handle commission rate change with validation
  const handleCommissionRateChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    const numValue = parseFloat(value);

    // Only update if it's a valid number
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 1) {
      setValue("commissionRate", numValue);
      trigger("commissionRate"); // Trigger validation
    }
  };

  const onFormSubmit = (data: BookingFormData) => {
    onSubmit(data);
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2>
            {booking
              ? t("bookingDialog.editBooking")
              : t("bookingDialog.addBooking")}
          </h2>
          <button
            className="close-button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="clientId">
                  {t("bookingDialog.client")}
                </label>
                <select
                  id="clientId"
                  className={`form-input bg-white ${
                    errors.clientId ? "error" : ""
                  }`}
                  disabled={isSubmitting}
                  {...register("clientId", {
                    required: "Client is required",
                  })}
                  onChange={handleClientChange}
                >
                  <option value="">{t("bookingDialog.selectClient")}</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                {errors.clientId && (
                  <span className="error-message">
                    {errors.clientId.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="vehicleId">
                  {t("bookingDialog.vehicle")}
                </label>
                <select
                  id="vehicleId"
                  className={`form-input bg-white ${
                    errors.vehicleId ? "error" : ""
                  }`}
                  disabled={isSubmitting}
                  {...register("vehicleId", {
                    required: "Vehicle is required",
                  })}
                >
                  <option value="">{t("bookingDialog.selectVehicle")}</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} - ${vehicle.price}/day
                    </option>
                  ))}
                </select>
                {errors.vehicleId && (
                  <span className="error-message">
                    {errors.vehicleId.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="agentId">
                  {t("bookingDialog.agent")}
                </label>
                <select
                  id="agentId"
                  className={`form-input bg-white ${
                    errors.agentId ? "error" : ""
                  }`}
                  disabled={isSubmitting}
                  {...register("agentId", {
                    required: "Agent is required",
                  })}
                  onChange={handleAgentChange}
                >
                  <option value="">{t("bookingDialog.selectAgent")}</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                {errors.agentId && (
                  <span className="error-message">
                    {errors.agentId.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="startDate">
                  {t("bookingDialog.startDate")}
                </label>
                <input
                  type="datetime-local"
                  id="startDate"
                  className={`form-input ${errors.startDate ? "error" : ""}`}
                  disabled={isSubmitting}
                  {...register("startDate", {
                    required: "Start date is required",
                  })}
                />
                {errors.startDate && (
                  <span className="error-message">
                    {errors.startDate.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="endDate">
                  {t("bookingDialog.endDate")}
                </label>
                <input
                  type="datetime-local"
                  id="endDate"
                  className={`form-input ${errors.endDate ? "error" : ""}`}
                  disabled={isSubmitting}
                  {...register("endDate", {
                    required: "End date is required",
                  })}
                />
                {errors.endDate && (
                  <span className="error-message">
                    {errors.endDate.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="status">
                  {t("bookingDialog.status")}
                </label>
                <select
                  id="status"
                  className={`form-input bg-white ${
                    errors.status ? "error" : ""
                  }`}
                  disabled={isSubmitting}
                  {...register("status", {
                    required: "Status is required",
                  })}
                >
                  <option value="confirmed">
                    {t("bookingDialog.confirmed")}
                  </option>
                  <option value="pending">{t("bookingDialog.pending")}</option>
                  <option value="completed">
                    {t("bookingDialog.completed")}
                  </option>
                  <option value="cancelled">
                    {t("bookingDialog.cancelled")}
                  </option>
                </select>
                {errors.status && (
                  <span className="error-message">{errors.status.message}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="paymentStatus">
                  {t("bookingDialog.payment")}
                </label>
                <select
                  id="paymentStatus"
                  className={`form-input bg-white ${
                    errors.paymentStatus ? "error" : ""
                  }`}
                  disabled={isSubmitting}
                  {...register("paymentStatus", {
                    required: "Payment status is required",
                  })}
                >
                  <option value="paid">{t("bookingDialog.paid")}</option>
                  <option value="pending">
                    {t("bookingDialog.paymentPending")}
                  </option>
                </select>
                {errors.paymentStatus && (
                  <span className="error-message">
                    {errors.paymentStatus.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="amount">
                  {t("bookingDialog.amount")}
                </label>
                <input
                  type="number"
                  id="amount"
                  className={`form-input ${errors.amount ? "error" : ""}`}
                  min="0"
                  step="0.01"
                  disabled={isSubmitting}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 0, message: "Amount must be positive" },
                    valueAsNumber: true,
                  })}
                />
                {errors.amount && (
                  <span className="error-message">{errors.amount.message}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="commissionRate">
                  Commission Rate (0-1)
                </label>
                <input
                  type="number"
                  id="commissionRate"
                  className={`form-input ${
                    errors.commissionRate ? "error" : ""
                  }`}
                  min="0"
                  max="1"
                  step="0.01"
                  disabled={isSubmitting}
                  {...register("commissionRate", {
                    required: "Commission rate is required",
                    min: {
                      value: 0,
                      message: "Rate must be between 0 and 1",
                    },
                    max: {
                      value: 1,
                      message: "Rate must be between 0 and 1",
                    },
                    valueAsNumber: true,
                    onChange: handleCommissionRateChange,
                  })}
                />
                {errors.commissionRate && (
                  <span className="error-message">
                    {errors.commissionRate.message}
                  </span>
                )}
                <small className="form-hint">
                  Enter as decimal (e.g., 0.08 for 8%)
                </small>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="commission">
                  Commission Amount ($)
                </label>
                <input
                  type="number"
                  id="commission"
                  className="form-input"
                  readOnly
                  disabled
                  {...register("commission", {
                    valueAsNumber: true,
                  })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="pickupLocation">
                  {t("bookingDialog.pickupLocation")}
                </label>
                <input
                  type="text"
                  id="pickupLocation"
                  className={`form-input ${
                    errors.pickupLocation ? "error" : ""
                  }`}
                  disabled={isSubmitting}
                  {...register("pickupLocation", {
                    required: "Pickup location is required",
                  })}
                />
                {errors.pickupLocation && (
                  <span className="error-message">
                    {errors.pickupLocation.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="returnLocation">
                  {t("bookingDialog.returnLocation")}
                </label>
                <input
                  type="text"
                  id="returnLocation"
                  className={`form-input ${
                    errors.returnLocation ? "error" : ""
                  }`}
                  disabled={isSubmitting}
                  {...register("returnLocation", {
                    required: "Return location is required",
                  })}
                />
                {errors.returnLocation && (
                  <span className="error-message">
                    {errors.returnLocation.message}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t("bookingDialog.cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t("bookingDialog.saving")
                : t("bookingDialog.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
