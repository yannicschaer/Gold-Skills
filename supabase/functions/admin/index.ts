import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AdminRequest {
  action: "invite" | "changeRole" | "deactivate" | "reactivate" | "remove";
  email?: string;
  userId?: string;
  role?: "admin" | "designer" | "operations";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 1. Verify caller is authenticated
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return errorResponse("Missing auth header", 401);
  }

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    return errorResponse("Unauthorized", 401);
  }

  // 2. Verify admin role server-side
  const { data: callerProfile } = await supabaseUser
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return errorResponse("Forbidden: admin only", 403);
  }

  // 3. Service-role client for admin operations
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 4. Dispatch by action
  const body: AdminRequest = await req.json();

  switch (body.action) {
    case "invite": {
      if (!body.email) return errorResponse("Email required", 400);
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        body.email
      );
      if (error) return errorResponse(error.message, 400);
      return jsonResponse({ success: true, user: data.user });
    }

    case "changeRole": {
      if (!body.userId || !body.role) {
        return errorResponse("userId and role required", 400);
      }
      if (body.userId === user.id) {
        return errorResponse("Cannot change your own role", 400);
      }
      // Prevent demoting the last admin — only check if target user is currently an admin
      if (body.role !== "admin") {
        const { data: targetProfile } = await supabaseAdmin
          .from("profiles")
          .select("role")
          .eq("id", body.userId)
          .single();
        if (targetProfile?.role === "admin") {
          const { count } = await supabaseAdmin
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "admin")
            .eq("is_active", true);
          if (count !== null && count <= 1) {
            return errorResponse("Cannot demote the last admin", 400);
          }
        }
      }
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ role: body.role })
        .eq("id", body.userId);
      if (error) return errorResponse(error.message, 400);
      return jsonResponse({ success: true });
    }

    case "deactivate": {
      if (!body.userId) return errorResponse("userId required", 400);
      if (body.userId === user.id) {
        return errorResponse("Cannot deactivate yourself", 400);
      }
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_active: false })
        .eq("id", body.userId);
      if (error) return errorResponse(error.message, 500);
      await supabaseAdmin.auth.admin.updateUserById(body.userId, {
        ban_duration: "876600h",
      });
      return jsonResponse({ success: true });
    }

    case "reactivate": {
      if (!body.userId) return errorResponse("userId required", 400);
      await supabaseAdmin
        .from("profiles")
        .update({ is_active: true })
        .eq("id", body.userId);
      await supabaseAdmin.auth.admin.updateUserById(body.userId, {
        ban_duration: "none",
      });
      return jsonResponse({ success: true });
    }

    case "remove": {
      if (!body.userId) return errorResponse("userId required", 400);
      if (body.userId === user.id) {
        return errorResponse("Cannot remove yourself", 400);
      }
      const { error } = await supabaseAdmin.auth.admin.deleteUser(
        body.userId
      );
      if (error) return errorResponse(error.message, 400);
      return jsonResponse({ success: true });
    }

    default:
      return errorResponse("Unknown action", 400);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
