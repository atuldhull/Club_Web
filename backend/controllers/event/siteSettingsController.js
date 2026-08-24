/**
 * Site Settings Controller — Global site configuration
 */

import supabase from "../../config/supabase.js";
import { logger } from "../../config/logger.js";

const ALLOWED_SETTING_KEYS = [
  "registrations_open",
  "site_notice",
  "arena_open",
  "registration_message",
  "banner_enabled",
  "banner_audience",
  "banner_style",
];

export const getSiteSettings = async (req, res) => {
  try {
    const { data, error } = await supabase.from("site_settings").select("*");
    if (error) return res.status(500).json({ error: error.message });
    const settings = {};
    (data || []).forEach(row => { settings[row.key] = row.value; });
    return res.json(settings);
  } catch (err) {
    logger.error({ err }, "getSiteSettings");
    return res.status(500).json({ error: "Failed" });
  }
};

export const updateSiteSetting = async (req, res) => {
  const userId = req.session?.user?.id;
  try {
    const { value } = req.body;
    const key = req.params.key;
    if (!ALLOWED_SETTING_KEYS.includes(key))
      return res.status(400).json({ error: "Unknown setting key" });

    const { error } = await supabase.from("site_settings")
      .upsert({ key, value: String(value), updated_at: new Date().toISOString(), updated_by: userId });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, key, value });
  } catch (err) {
    logger.error({ err, key: req.params.key, userId }, "updateSiteSetting");
    return res.status(500).json({ error: "Failed" });
  }
};
