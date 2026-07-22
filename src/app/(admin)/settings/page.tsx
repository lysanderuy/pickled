"use client";

import { useState } from "react";

import { Field } from "@/components/ui/field";
import { OperatingHoursEditor } from "@/components/ui/operating-hours-editor";
import { useFacility, useUpdateFacility } from "@/hooks/use-facility";
import type { FacilityResponse, OperatingHours } from "@/validators/facility.validator";

const input = "border border-black px-2 py-1";
const button = "border border-black px-2 py-1 disabled:opacity-50";

export default function SettingsPage() {
  const facility = useFacility();

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Settings</h1>
      {facility.isLoading && <p className="text-sm">Loading...</p>}
      {facility.error && <p className="text-sm">{facility.error.message}</p>}
      {facility.data && <SettingsForm key={facility.data.updatedAt} facility={facility.data} />}
    </div>
  );
}

function SettingsForm({ facility }: { facility: FacilityResponse }) {
  const update = useUpdateFacility();
  const [name, setName] = useState(facility.name);
  const [description, setDescription] = useState(facility.description ?? "");
  const [address, setAddress] = useState(facility.address);
  const [latitude, setLatitude] = useState(
    facility.latitude !== null ? String(facility.latitude) : "",
  );
  const [longitude, setLongitude] = useState(
    facility.longitude !== null ? String(facility.longitude) : "",
  );
  const [contactPhone, setContactPhone] = useState(facility.contactPhone);
  const [contactEmail, setContactEmail] = useState(facility.contactEmail);
  const [facebookUrl, setFacebookUrl] = useState(facility.facebookUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState(facility.instagramUrl ?? "");
  const [amenities, setAmenities] = useState((facility.amenities ?? []).join(", "));
  const [photoUrls, setPhotoUrls] = useState((facility.photoUrls ?? []).join("\n"));
  const [operatingHours, setOperatingHours] = useState<OperatingHours>(facility.operatingHours);
  const [slotGranularity, setSlotGranularity] = useState(String(facility.slotGranularityMinutes));
  const [bookingHoldMinutes, setBookingHoldMinutes] = useState(String(facility.bookingHoldMinutes));

  return (
    <form
      className="flex max-w-2xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const amenityList = amenities
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean);
        const photoList = photoUrls
          .split("\n")
          .map((u) => u.trim())
          .filter(Boolean);
        update.mutate({
          name,
          description: description || null,
          address,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          contactPhone,
          contactEmail,
          facebookUrl: facebookUrl || null,
          instagramUrl: instagramUrl || null,
          amenities: amenityList.length > 0 ? amenityList : null,
          photoUrls: photoList.length > 0 ? photoList : null,
          operatingHours,
          slotGranularityMinutes: Number(slotGranularity) === 30 ? 30 : 60,
          bookingHoldMinutes: Number(bookingHoldMinutes),
        });
      }}
    >
      <div className="flex flex-wrap gap-3">
        <Field label="Name">
          <input
            className={input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        <Field label="Address">
          <input
            className={input}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </Field>
        <Field label="Latitude">
          <input
            type="number"
            step="any"
            className={input}
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
          />
        </Field>
        <Field label="Longitude">
          <input
            type="number"
            step="any"
            className={input}
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Description">
        <textarea
          className={input}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <div className="flex flex-wrap gap-3">
        <Field label="Contact phone">
          <input
            className={input}
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            required
          />
        </Field>
        <Field label="Contact email">
          <input
            type="email"
            className={input}
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Facebook URL">
          <input
            className={input}
            value={facebookUrl}
            onChange={(e) => setFacebookUrl(e.target.value)}
          />
        </Field>
        <Field label="Instagram URL">
          <input
            className={input}
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Amenities (comma-separated)">
        <input className={input} value={amenities} onChange={(e) => setAmenities(e.target.value)} />
      </Field>
      <Field label="Photo URLs (one per line)">
        <textarea
          className={input}
          rows={3}
          value={photoUrls}
          onChange={(e) => setPhotoUrls(e.target.value)}
        />
      </Field>
      <div>
        <p className="mb-1 text-sm">Operating hours</p>
        <OperatingHoursEditor value={operatingHours} onChange={setOperatingHours} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Field label="Slot granularity (minutes)">
          <select
            className={input}
            value={slotGranularity}
            onChange={(e) => setSlotGranularity(e.target.value)}
          >
            <option value="30">30</option>
            <option value="60">60</option>
          </select>
        </Field>
        <Field label="Booking hold minutes">
          <input
            type="number"
            min={1}
            className={input}
            value={bookingHoldMinutes}
            onChange={(e) => setBookingHoldMinutes(e.target.value)}
            required
          />
        </Field>
      </div>
      <div>
        <button type="submit" className={button} disabled={update.isPending}>
          Save settings
        </button>
      </div>
      {update.error && <p className="text-sm">{update.error.message}</p>}
      {update.isSuccess && !update.isPending && <p className="text-sm">Saved.</p>}
    </form>
  );
}
