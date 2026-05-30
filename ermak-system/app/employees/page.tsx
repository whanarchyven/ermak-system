"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthActions } from "@convex-dev/auth/react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users } from "lucide-react";

export default function EmployeesPage() {
  const employees = (useQuery(api.users.list) || []) as any[];
  const setProfileByEmail = useMutation(api.users.setProfileByEmail);
  const { signIn } = useAuthActions();
  const update = useMutation(api.users.update);
  const remove = useMutation(api.users.remove);

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("cook");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onCreate = async () => {
    if (!fullName || !role || !email || !password) return;
    const fd = new FormData();
    fd.set("flow", "signUp");
    fd.set("email", email);
    fd.set("password", password);
    await signIn("password", fd);
    await setProfileByEmail({ email, fullName, role: role as any });
    setFullName(""); setRole("cook"); setEmail(""); setPassword("");
  };

  return (
    <div className="space-y-6 max-w-6xl mt-5 mx-auto">
      <Card>
        <CardHeader className="bg-zinc-800 text-white">
          <div className="flex items-center gap-4 justify-between">
          <CardTitle className="text-xl"><div className="flex items-center gap-4"> Сотрудники<Users className="size-7" /></div>   </CardTitle>
          <div className="flex items-center justify-between">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-white text-black hover:bg-white/90">Добавить</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Регистрация сотрудника</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                  <Input placeholder="ФИО" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Роль" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Админ</SelectItem>
                      <SelectItem value="bartender">Бармен</SelectItem>
                      <SelectItem value="cook">Повар</SelectItem>
                      <SelectItem value="courier">Курьер</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Input placeholder="Пароль" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button onClick={onCreate}>Создать</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ФИО</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e: any) => (
                <TableRow key={e._id}>
                  <TableCell>{e.fullName}</TableCell>
                  <TableCell>{mapRole(e.role)}</TableCell>
                  <TableCell>{e.email}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="destructive" onClick={async () => { await remove({ id: e._id }); }}>Удалить</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function mapRole(r: string) {
  switch (r) {
    case "admin": return "Админ";
    case "bartender": return "Бармен";
    case "cook": return "Повар";
    case "courier": return "Курьер";
    default: return r;
  }
}


