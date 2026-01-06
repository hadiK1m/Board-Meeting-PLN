import { db } from "@/db";
import { agendas } from "@/db/schema";
import { desc } from "drizzle-orm";
import { differenceInDays } from "date-fns";

export async function getRadirAgendas() {
    const data = await db.query.agendas.findMany({
        orderBy: [desc(agendas.createdAt)],
    });

    return data.map((item) => {
        const daysRemaining = differenceInDays(new Date(item.deadline), new Date());

        let priority: "High" | "Medium" | "Low";
        if (daysRemaining <= 7) priority = "High";
        else if (daysRemaining <= 14) priority = "Medium";
        else priority = "Low";

        return { ...item, priority };
    });
}