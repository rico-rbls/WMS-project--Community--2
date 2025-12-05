import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface TermsConditionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TermsConditionsDialog({ open, onOpenChange }: TermsConditionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Terms and Conditions</DialogTitle>
          <DialogDescription>
            Please read these terms carefully before using our Warehouse Management System.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4 text-sm text-muted-foreground">
            <section>
              <h3 className="font-semibold text-foreground mb-2">1. Acceptance of Terms</h3>
              <p>
                By accessing and using this Warehouse Management System ("WMS"), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use this system.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">2. User Accounts</h3>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials. You agree to notify the system administrator immediately of any unauthorized use of your account. You are responsible for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">3. Acceptable Use</h3>
              <p>
                You agree to use this system only for lawful purposes and in accordance with these Terms. You agree not to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Use the system in any way that violates any applicable laws or regulations</li>
                <li>Attempt to gain unauthorized access to other user accounts or system resources</li>
                <li>Introduce any viruses, malware, or other harmful code</li>
                <li>Interfere with or disrupt the system's operation</li>
                <li>Share your login credentials with unauthorized parties</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">4. Data Privacy</h3>
              <p>
                Your use of this system is also governed by our Privacy Policy. By using this system, you consent to the collection and use of information as described in our Privacy Policy. We are committed to protecting your personal information and business data.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">5. System Availability</h3>
              <p>
                While we strive to maintain high availability, we do not guarantee uninterrupted access to the system. We may perform maintenance, updates, or experience technical issues that temporarily affect system availability.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">6. Intellectual Property</h3>
              <p>
                All content, features, and functionality of this system are owned by the system provider and are protected by intellectual property laws. You may not copy, modify, or distribute any part of the system without prior written consent.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">7. Limitation of Liability</h3>
              <p>
                To the maximum extent permitted by law, the system provider shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the system.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">8. Changes to Terms</h3>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of any material changes. Your continued use of the system after such modifications constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">9. Termination</h3>
              <p>
                We may terminate or suspend your account and access to the system immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users or the system.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">10. Contact Information</h3>
              <p>
                If you have any questions about these Terms, please contact the system administrator.
              </p>
            </section>

            <p className="text-xs text-muted-foreground pt-4 border-t">
              Last updated: December 2024
            </p>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

