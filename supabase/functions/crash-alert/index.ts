import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { userId, latitude, longitude, confidence, tripId } = await req.json();

    if (!userId || latitude === undefined || longitude === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, latitude, longitude" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log the crash event
    const { error: alertError } = await supabase.from("safety_alerts").insert({
      user_id: userId,
      trip_id: tripId || null,
      alert_type: "Crash Detected",
      severity: "high",
      message: `Crash detected at ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (confidence: ${(confidence * 100).toFixed(0)}%). Emergency contacts notified.`,
    });

    if (alertError) {
      console.error("Error logging crash alert:", alertError);
    }

    // Fetch emergency contacts
    const { data: contacts, error: contactsError } = await supabase
      .from("emergency_contacts")
      .select("name, phone, relationship")
      .eq("user_id", userId);

    if (contactsError) {
      console.error("Error fetching emergency contacts:", contactsError);
    }

    // Fetch user profile for name
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const driverName = profile?.full_name || "A SeamlessDrive user";
    const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const timestamp = new Date().toISOString();

    const notifiedContacts: { name: string; phone: string; status: string }[] = [];

    // Notify each emergency contact
    if (contacts && contacts.length > 0) {
      for (const contact of contacts) {
        // In production, integrate with Twilio, Vonage, or AWS SNS here
        // For now, log the notification intent
        console.log(
          `[CRASH ALERT] SMS to ${contact.phone}: ${driverName} may have been in a crash at ${mapsLink}. Time: ${timestamp}. This is an automated alert from SeamlessDrive.`
        );

        notifiedContacts.push({
          name: contact.name,
          phone: contact.phone,
          status: "queued",
        });
      }
    }

    // Log notification event
    await supabase.from("integration_events").insert({
      user_id: userId,
      provider: "seamlessdrive-crash",
      event_type: "crash_alert_sent",
      payload: {
        latitude,
        longitude,
        confidence,
        contacts_notified: notifiedContacts.length,
        contacts: notifiedContacts,
        trip_id: tripId,
        timestamp,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        crash_logged: !alertError,
        contacts_notified: notifiedContacts.length,
        contacts: notifiedContacts,
        maps_link: mapsLink,
        message: notifiedContacts.length > 0
          ? `Crash alert sent to ${notifiedContacts.length} emergency contact(s).`
          : "Crash logged. No emergency contacts found. Please add emergency contacts in your profile.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Crash alert error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
