import { useState, useRef } from "react";
import { S, chip } from "./styles";
import { StarRating, MealTypeSelector } from "./shared";
import type { Member } from "@/data/supper-club-data";

interface ReviewFormProps {
  restaurantName: string;
  cuisine?: string;
  city?: string;
  members: Member[];
  reservationId?: string;
  onSubmit: (review: { restaurant_name: string; rating: number; review_text?: string; meal_type?: string; best_dish_member?: string; return_choice?: string; photo_url?: string; cuisine?: string; city?: string; reservation_id?: string; }) => Promise<boolean>;
  onUploadPhoto: (file: File) => Promise<string | null>;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export default function ReviewForm({ restaurantName, cuisine, city, members, reservationId, onSubmit, onUploadPhoto, onClose, showToast }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [mealType, setMealType] = useState("Dinner");
  const [bestDish, setBestDish] = useState<string | null>(null);
  const [returnChoice, setReturnChoice] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const url = await onUploadPhoto(file);
    if (url) setPhotoUrl(url); else showToast("Photo upload failed.");
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (rating === 0) { showToast("Please rate your experience."); return; }
    setSubmitting(true);
    const ok = await onSubmit({ restaurant_name: restaurantName, rating, review_text: text || undefined, meal_type: mealType, best_dish_member: bestDish || undefined, return_choice: returnChoice || undefined, photo_url: photoUrl || undefined, cuisine, city, reservation_id: reservationId });
    setSubmitting(false);
    if (ok) { showToast("Review submitted."); onClose(); } else showToast("Failed to submit review.");
  };

  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(42,42,42,0.95)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
      <div style={{ background:"#2a2a2a", border:"1px solid rgba(212,205,196,0.2)", borderRadius:"20px", padding:"24px", maxWidth:"360px", width:"100%", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
          <div>
            <div style={{ fontSize:"10px", color:"#d4cdc4", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"4px" }}>Review</div>
            <div style={{ fontSize:"18px", color:"#e5ded5", fontWeight:"500" }}>{restaurantName}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#8c8278", fontSize:"20px", cursor:"pointer", padding:"4px" }}>x</button>
        </div>

        <div style={{ marginBottom:"20px" }}><label style={S.label}>Overall Rating</label><StarRating value={rating} onChange={setRating} /></div>
        <div style={{ marginBottom:"20px" }}><label style={S.label}>Your Thoughts</label><textarea value={text} onChange={e => setText(e.target.value)} placeholder="What stood out about the evening..." style={{ ...S.input, minHeight:"80px", resize:"vertical" as any }} /></div>
        <div style={{ marginBottom:"20px" }}>
          <label style={S.label}>Meal Type</label>
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>{["Dinner","Lunch","Brunch","Late Night"].map(t => <div key={t} style={chip(mealType === t)} onClick={() => setMealType(t)}>{t}</div>)}</div>
        </div>
        {members.length > 1 && (
          <div style={{ marginBottom:"20px" }}>
            <label style={S.label}>Best Dish of the Evening</label>
            <div style={{ fontSize:"11px", color:"#565250", fontStyle:"italic", marginBottom:"10px" }}>Who ordered the standout dish?</div>
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>{members.map(m => <div key={m.name} style={chip(bestDish === m.name)} onClick={() => setBestDish(bestDish === m.name ? null : m.name)}>{m.name}</div>)}</div>
          </div>
        )}
        <div style={{ marginBottom:"20px" }}>
          <label style={S.label}>Would You Return?</label>
          <div style={{ display:"flex", gap:"8px" }}>{["Absolutely","Maybe","Once was enough"].map(c => <div key={c} style={chip(returnChoice === c)} onClick={() => setReturnChoice(returnChoice === c ? null : c)}>{c}</div>)}</div>
        </div>
        <div style={{ marginBottom:"24px" }}>
          <label style={S.label}>Add a Photo</label>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:"none" }} />
          {photoUrl ? (
            <div style={{ position:"relative" }}>
              <img src={photoUrl} alt="Review" style={{ width:"100%", height:"120px", objectFit:"cover", borderRadius:"12px" }} />
              <button onClick={() => { setPhotoUrl(null); if (fileRef.current) fileRef.current.value = ""; }} style={{ position:"absolute", top:"8px", right:"8px", background:"rgba(0,0,0,0.6)", border:"none", color:"#e5ded5", borderRadius:"50%", width:"24px", height:"24px", cursor:"pointer", fontSize:"12px" }}>x</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} style={{ ...S.ghostBtn, marginBottom:0, fontSize:"12px", padding:"12px" }}>{uploading ? "Uploading..." : "Choose Photo"}</button>
          )}
        </div>
        <button style={{ ...S.primaryBtn, marginBottom:"8px", opacity:submitting?0.6:1 }} onClick={handleSubmit} disabled={submitting}>{submitting ? "Submitting..." : "Submit Review"}</button>
        <button style={{ ...S.ghostBtn, marginBottom:0 }} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}